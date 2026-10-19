import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { enforcePayloadSize, enforceRateLimit, getClientIp } from '@/lib/rate-limiter';
import {
  validateEmail,
  validatePassword,
  sanitizeString,
  validateAcademicLevel,
} from '@/lib/security-validator';
import { normalizeFieldCode } from '@/lib/academic-reference';
import { registerSchema, safeParseAuthBody } from '@/lib/auth-schemas';
import { logSecurityEvent } from '@/lib/security-logger';
import { createAdminClient } from '@/lib/supabase/server';
import { sendVerificationEmail } from '@/lib/email';
import { CURRENT_ACADEMIC_YEAR_ID, ensureAcademicYear, normalizeCivility } from '@/lib/server-session';
import { buildConfirmEmailUrl, getAppUrl, type EmailLinkType } from '@/lib/auth-links';

export async function POST(req: Request) {
  const ip = getClientIp(req);

  const payloadCheck = enforcePayloadSize(req, 'AUTH');
  if (payloadCheck) return payloadCheck;

  const rateLimit = await enforceRateLimit(req, 'AUTH', {
    discriminator: 'register',
    customMessage: 'Trop de tentatives d’inscription. Veuillez patienter un instant avant de réessayer.',
  });
  if (rateLimit) return rateLimit;

  try {
    const body = await req.json().catch(() => ({}));

    // Couche 1 — validation Zod structurelle (types, présence, longueurs).
    const zodCheck = safeParseAuthBody(registerSchema, body);
    if (!zodCheck.success) {
      return NextResponse.json({ success: false, error: zodCheck.error }, { status: 400 });
    }

    // Couche 2 — validation métier (règles fines, normalisation).
    const emailValidation = validateEmail(body.email);
    if (!emailValidation.isValid) {
      return NextResponse.json(
        { success: false, error: emailValidation.error || 'Adresse email invalide.' },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(body.password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error:
            passwordValidation.error ||
            'Le mot de passe doit comporter au moins 8 caractères, dont une majuscule, une minuscule et un chiffre.',
        },
        { status: 400 }
      );
    }

    // "Monsieur"/"Madame"/"Mademoiselle" (formulaire) -> 'm'/'mme'/'mlle' (enum PostgreSQL).
    const civility = normalizeCivility(body.civility);
    const lastName = sanitizeString(body.lastName, 60);
    const firstName = sanitizeString(body.firstName, 60);
    const rawStudentId = sanitizeString(body.studentId || body.matricule, 50);
    const field = normalizeFieldCode(body.field).fieldCode;
    const levelValidation = validateAcademicLevel(body.level || 'L1');

    if (!lastName || !firstName) {
      return NextResponse.json(
        { success: false, error: 'Le nom et le prénom sont obligatoires.' },
        { status: 400 }
      );
    }

    const cleanEmail = emailValidation.cleanEmail;
    const admin = createAdminClient();

    // Matricule saisi : doit être unique. Matricule généré : aléatoire (l'ancien
    // `ETU-` + 6 derniers chiffres de Date.now() bouclait toutes les ~16 minutes
    // et provoquait des collisions sur la contrainte unique).
    if (rawStudentId) {
      const { data: existingStudent } = await admin
        .from('student_profiles')
        .select('user_id, profiles!inner(email)')
        .eq('student_id', rawStudentId)
        .maybeSingle();
      const ownerEmail = (existingStudent as { profiles?: { email?: string } } | null)?.profiles?.email;
      if (existingStudent && ownerEmail !== cleanEmail) {
        return NextResponse.json(
          { success: false, error: 'Ce matricule étudiant est déjà enregistré.' },
          { status: 409 }
        );
      }
    }
    const studentId = rawStudentId || `ETU-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // L'année courante doit exister AVEC ses 2 semestres (FK de student_profiles et des cours).
    await ensureAcademicYear(admin, CURRENT_ACADEMIC_YEAR_ID);

    // 1. Création du compte Supabase Auth. generateLink n'envoie AUCUN e-mail :
    //    on récupère le token haché et on envoie nous-mêmes le lien via Resend.
    let userId: string;
    let hashedToken: string | undefined;
    let linkType: EmailLinkType = 'signup';
    let createdNewAuthUser = false;

    const { data: signUpData, error: signUpError } = await admin.auth.admin.generateLink({
      type: 'signup',
      email: cleanEmail,
      password: body.password,
      options: { data: { first_name: firstName, last_name: lastName } },
    });

    if (!signUpError && signUpData?.user) {
      userId = signUpData.user.id;
      hashedToken = signUpData.properties?.hashed_token;
      // Pour un compte existant NON confirmé, Supabase ne renvoie pas d'erreur
      // mais ne met PAS à jour le mot de passe : on distingue les deux cas.
      createdNewAuthUser = Date.now() - new Date(signUpData.user.created_at).getTime() < 2 * 60 * 1000;
      if (!createdNewAuthUser) {
        const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
          password: body.password,
          user_metadata: { first_name: firstName, last_name: lastName },
        });
        if (updateError) {
          return NextResponse.json(
            { success: false, error: 'Impossible de reprendre cette inscription. Réessayez plus tard.' },
            { status: 500 }
          );
        }
      }
    } else {
      // Le compte Auth existe peut-être déjà (inscription précédente jamais
      // confirmée, ou profil jamais finalisé à cause d'une ancienne erreur).
      // generateLink('magiclink') ne crée rien et n'envoie rien : il sert ici
      // à retrouver l'utilisateur existant.
      const { data: probe } = await admin.auth.admin.generateLink({ type: 'magiclink', email: cleanEmail });
      const existingUser = probe?.user;

      if (!existingUser) {
        logSecurityEvent({
          eventType: 'AUTH_REGISTER_FAILURE',
          severity: 'WARN',
          ip,
          userIdentifier: cleanEmail,
          details: { reason: signUpError?.message },
        });
        return NextResponse.json(
          { success: false, error: 'Impossible de créer le compte pour le moment. Réessayez dans quelques instants.' },
          { status: 500 }
        );
      }

      if (existingUser.email_confirmed_at) {
        return NextResponse.json(
          {
            success: false,
            error: 'Un compte confirmé existe déjà avec cette adresse e-mail. Connectez-vous, ou utilisez « Mot de passe oublié ».',
            code: 'EMAIL_ALREADY_REGISTERED',
          },
          { status: 409 }
        );
      }

      // Compte jamais confirmé : on reprend l'inscription (seul le propriétaire
      // réel de la boîte mail pourra la confirmer, donc aucun risque de vol).
      userId = existingUser.id;
      const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
        password: body.password,
        user_metadata: { first_name: firstName, last_name: lastName },
      });
      if (updateError) {
        return NextResponse.json(
          { success: false, error: 'Impossible de reprendre cette inscription. Réessayez plus tard.' },
          { status: 500 }
        );
      }
      // Vérifier un lien magiclink confirme aussi l'adresse d'un compte non confirmé.
      hashedToken = probe?.properties?.hashed_token;
      linkType = 'magiclink';
    }

    // 2. Profil applicatif (client admin : opération serveur de confiance).
    //    upsert : idempotent si une tentative précédente avait déjà créé la ligne.
    const { error: profileError } = await admin.from('profiles').upsert(
      {
        id: userId,
        email: cleanEmail,
        first_name: firstName,
        last_name: lastName,
        role: 'student',
        status: 'active',
      },
      { onConflict: 'id' }
    );

    const { error: studentProfileError } = profileError
      ? { error: null }
      : await admin.from('student_profiles').upsert(
          {
            user_id: userId,
            student_id: studentId,
            civility,
            level_code: levelValidation.levelCode,
            field_code: field,
            academic_year_id: CURRENT_ACADEMIC_YEAR_ID,
          },
          { onConflict: 'user_id' }
        );

    if (profileError || studentProfileError) {
      const message = (profileError || studentProfileError)?.message;
      logSecurityEvent({
        eventType: 'SYSTEM_ERROR',
        severity: 'ERROR',
        ip,
        userIdentifier: cleanEmail,
        details: { route: '/api/auth/register', step: profileError ? 'profile_upsert' : 'student_profile_upsert', error: message },
      });
      // Rollback : sans ça, le compte Auth restait orphelin et chaque nouvelle
      // tentative répondait "email déjà utilisé".
      if (createdNewAuthUser) {
        await admin.auth.admin.deleteUser(userId).catch(() => undefined);
      }
      return NextResponse.json(
        { success: false, error: 'Le compte n’a pas pu être finalisé. Veuillez réessayer.' },
        { status: 500 }
      );
    }

    // 3. E-mail de confirmation — lien direct vers l'app (voir lib/auth-links.ts).
    let emailSent = false;
    if (hashedToken) {
      try {
        await sendVerificationEmail(cleanEmail, buildConfirmEmailUrl(getAppUrl(req), hashedToken, linkType));
        emailSent = true;
      } catch (emailErr) {
        logSecurityEvent({
          eventType: 'SYSTEM_ERROR',
          severity: 'ERROR',
          ip,
          userIdentifier: cleanEmail,
          details: { route: '/api/auth/register', step: 'send_verification_email', error: String(emailErr) },
        });
      }
    }

    logSecurityEvent({
      eventType: 'AUTH_REGISTER_SUCCESS',
      severity: 'INFO',
      ip,
      userIdentifier: cleanEmail,
      details: { role: 'student', emailSent, resumed: !createdNewAuthUser },
    });

    // Pas de session automatique : le compte doit être confirmé par e-mail,
    // puis l'étudiant se connecte depuis /login.
    return NextResponse.json(
      {
        success: true,
        emailSent,
        message: emailSent
          ? 'Compte créé. Vérifiez votre boîte e-mail et cliquez sur le lien de confirmation, puis connectez-vous.'
          : 'Compte créé, mais l’e-mail de confirmation n’a pas pu être envoyé. Utilisez « Renvoyer l’e-mail de confirmation » depuis la page de connexion.',
        requiresEmailConfirmation: true,
        user: {
          id: userId,
          email: cleanEmail,
          firstName,
          lastName,
          role: 'student',
          status: 'active',
          studentProfile: {
            studentId,
            levelCode: levelValidation.levelCode,
            fieldCode: field,
            academicYearId: CURRENT_ACADEMIC_YEAR_ID,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logSecurityEvent({
      eventType: 'SYSTEM_ERROR',
      severity: 'ERROR',
      ip,
      details: { route: '/api/auth/register', error: (error as Error).message },
    });

    return NextResponse.json(
      { success: false, error: 'Une erreur est survenue lors de l’inscription.' },
      { status: 500 }
    );
  }
}
