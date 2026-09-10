import { NextResponse } from 'next/server';
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

const CURRENT_ACADEMIC_YEAR = '2026-2027';

export async function POST(req: Request) {
  const ip = getClientIp(req);

  const payloadCheck = enforcePayloadSize(req, 'AUTH');
  if (payloadCheck) return payloadCheck;

  const rateLimit = enforceRateLimit(req, 'AUTH', {
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

    // Couche 2 — validation métier existante (règles fines, normalisation).
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
            'Le mot de passe doit comporter au moins 8 caractères, dont une majuscule, une minuscule, un chiffre et un caractère spécial.',
        },
        { status: 400 }
      );
    }

    const rawCivility = sanitizeString(body.civility, 10).toLowerCase();
    const civility = rawCivility === 'mme' ? 'mme' : rawCivility === 'mlle' ? 'mlle' : 'm';
    const lastName = sanitizeString(body.lastName, 60);
    const firstName = sanitizeString(body.firstName, 60);
    const rawStudentId = sanitizeString(body.studentId || body.matricule, 50);
    // BUG CORRIGÉ : `field` était auparavant stocké tel quel (ex. "Histoire-Géographie",
    // avec majuscule et accent) au lieu du code court ("histoire_geographie") utilisé
    // partout ailleurs (courses.field_code, delegate_profiles.field_code...). Résultat :
    // un étudiant inscrit avec une autre filière que la valeur par défaut ne voyait jamais
    // ses propres cours, le filtrage par filière ne matchait jamais. Voir migration 0002.
    const field = normalizeFieldCode(body.field).fieldCode;
    const levelValidation = validateAcademicLevel(body.level || 'L1');

    if (!lastName || !firstName) {
      return NextResponse.json(
        { success: false, error: 'Le nom et le prénom sont obligatoires.' },
        { status: 400 }
      );
    }

    const cleanEmail = emailValidation.cleanEmail;
    const studentId = rawStudentId || `ETU-${Date.now().toString().slice(-6)}`;
    const admin = createAdminClient();

    // Le matricule doit être unique : vérifié via le client admin (contourne RLS légitimement,
    // c'est une vérification serveur de confiance, pas une donnée manipulable par le client).
    const { data: existingStudent } = await admin
      .from('student_profiles')
      .select('id')
      .eq('student_id', studentId)
      .maybeSingle();

    if (existingStudent) {
      return NextResponse.json(
        { success: false, error: 'Ce matricule étudiant est déjà enregistré.' },
        { status: 409 }
      );
    }

    // S'assure que l'année universitaire courante existe (jamais de 3e semestre).
    await admin.from('academic_years').upsert(
      {
        id: CURRENT_ACADEMIC_YEAR,
        name: `Année Universitaire ${CURRENT_ACADEMIC_YEAR}`,
        start_year: 2026,
        end_year: 2027,
        status: 'active',
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );

    // 1. Création du compte réel dans Supabase Auth. On utilise generateLink
    // (plutôt que signUp classique) pour récupérer le lien de confirmation
    // nous-mêmes et l'envoyer via Resend : le mailer intégré de Supabase
    // (gratuit) est très limité en volume et peu fiable pour un vrai usage.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const { data: signUpData, error: signUpError } = await admin.auth.admin.generateLink({
      type: 'signup',
      email: cleanEmail,
      password: body.password,
      options: {
        data: { first_name: firstName, last_name: lastName },
        redirectTo: appUrl ? `${appUrl}/auth/callback` : undefined,
      },
    });

    if (signUpError || !signUpData.user) {
      console.error('[SUPABASE SIGNUP ERROR]', {
        message: signUpError?.message,
        code: signUpError?.code,
        status: signUpError?.status,
      });

      logSecurityEvent({

        eventType: 'AUTH_REGISTER_FAILURE',

        severity: 'WARN',

        ip,

        userIdentifier: cleanEmail,

        details: { reason: signUpError?.message },

      });

      return NextResponse.json(

        {
          success: false,
          error: signUpError?.message || 'Erreur inconnue',
        },

        { status: 409 }
      );

    }

    const userId = signUpData.user.id;

    // 2. Création du profil applicatif (opération serveur de confiance -> client admin).
    const { error: profileError } = await admin.from('profiles').insert({
      id: userId,
      email: cleanEmail,
      first_name: firstName,
      last_name: lastName,
      role: 'student',
      status: 'active',
    });

    if (profileError) {
      logSecurityEvent({
        eventType: 'SYSTEM_ERROR',
        severity: 'ERROR',
        ip,
        userIdentifier: cleanEmail,
        details: { route: '/api/auth/register', step: 'profile_insert', error: profileError.message },
      });
      return NextResponse.json(
        { success: false, error: 'Le compte a été créé mais le profil n’a pas pu être finalisé. Contactez le support.' },
        { status: 500 }
      );
    }

    const { error: studentProfileError } = await admin.from('student_profiles').insert({
      user_id: userId,
      student_id: studentId,
      civility,
      level_code: levelValidation.levelCode,
      field_code: field,
      academic_year_id: CURRENT_ACADEMIC_YEAR,
    });

    if (studentProfileError) {
      logSecurityEvent({
        eventType: 'SYSTEM_ERROR',
        severity: 'ERROR',
        ip,
        userIdentifier: cleanEmail,
        details: { route: '/api/auth/register', step: 'student_profile_insert', error: studentProfileError.message },
      });
      return NextResponse.json(
        { success: false, error: 'Le compte a été créé mais le profil étudiant n’a pas pu être finalisé. Contactez le support.' },
        { status: 500 }
      );
    }

    const actionLink = signUpData.properties?.action_link;
    let emailSent = false;
    if (actionLink) {
      try {
        await sendVerificationEmail(cleanEmail, actionLink);
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
      details: { role: 'student', emailSent },
    });

    // Pas de session automatique : le compte doit être confirmé par e-mail avant tout accès
    // (voir /api/auth/login qui bloque explicitement les comptes non confirmés).
    return NextResponse.json(
      {
        success: true,
        message: emailSent
          ? 'Compte créé. Vérifiez votre boîte e-mail pour confirmer votre adresse avant de vous connecter.'
          : 'Compte créé, mais l’e-mail de confirmation n’a pas pu être envoyé. Utilisez "Renvoyer l’e-mail de confirmation" depuis la page de connexion.',
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
            academicYearId: CURRENT_ACADEMIC_YEAR,
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
