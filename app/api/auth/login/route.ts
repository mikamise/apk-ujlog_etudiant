import { NextResponse } from 'next/server';
import { enforcePayloadSize, enforceRateLimit, getClientIp } from '@/lib/rate-limiter';
import { validateEmail, validatePassword } from '@/lib/security-validator';
import { loginSchema, safeParseAuthBody } from '@/lib/auth-schemas';
import { logSecurityEvent } from '@/lib/security-logger';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const ip = getClientIp(req);

  const payloadCheck = enforcePayloadSize(req, 'AUTH');
  if (payloadCheck) return payloadCheck;

  const rateLimitCheck = enforceRateLimit(req, 'AUTH', {
    discriminator: 'login',
    customMessage: 'Trop de tentatives de connexion. Veuillez patienter avant de réessayer.',
  });
  if (rateLimitCheck) return rateLimitCheck;

  try {
    const body = await req.json().catch(() => ({}));
    const { email, password } = body;

    // Couche 1 — validation Zod structurelle.
    const zodCheck = safeParseAuthBody(loginSchema, body);
    if (!zodCheck.success) {
      return NextResponse.json({ success: false, error: zodCheck.error }, { status: 400 });
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      logSecurityEvent({
        eventType: 'AUTH_LOGIN_FAILURE',
        severity: 'INFO',
        ip,
        details: { reason: emailValidation.error },
      });
      return NextResponse.json(
        { success: false, error: emailValidation.error || 'Veuillez saisir une adresse email valide.' },
        { status: 400 }
      );
    }

    const accountRateLimit = enforceRateLimit(req, 'AUTH', {
      discriminator: `login_target_${emailValidation.cleanEmail}`,
      customMessage: 'Trop de tentatives sur ce compte. Veuillez patienter.',
    });
    if (accountRateLimit) return accountRateLimit;

    if (!password || typeof password !== 'string' || password.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Veuillez renseigner votre mot de passe.' },
        { status: 400 }
      );
    }

    // Authentification réelle via Supabase Auth (le mot de passe ne transite
    // jamais par notre propre logique de hachage : Supabase s'en charge).
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailValidation.cleanEmail,
      password,
    });

    if (error || !data.user) {
      logSecurityEvent({
        eventType: 'AUTH_LOGIN_FAILURE',
        severity: 'WARN',
        ip,
        userIdentifier: emailValidation.cleanEmail,
        details: { reason: error?.message },
      });

      // Message volontairement générique : ne jamais révéler si l'email existe.
      return NextResponse.json(
        { success: false, error: 'Identifiants invalides ou compte non autorisé.' },
        { status: 401 }
      );
    }

    if (!data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          success: false,
          error: 'Veuillez confirmer votre adresse e-mail avant de vous connecter. Vérifiez votre boîte de réception.',
          code: 'EMAIL_NOT_CONFIRMED',
        },
        { status: 403 }
      );
    }

    // Récupère le profil applicatif (rôle, statut, infos étudiant/délégué)
    const { data: profile } = await supabase
      .from('profiles')
      .select(
        `id, email, first_name, last_name, role, status,
         student_profiles ( student_id, civility, level_code, field_code, academic_year_id, avatar_url ),
         delegate_profiles ( level_code, field_code, academic_year_id, status )`
      )
      .eq('id', data.user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profil introuvable. Contactez un administrateur.' },
        { status: 404 }
      );
    }

    if (profile.status !== 'active') {
      await supabase.auth.signOut();
      return NextResponse.json(
        { success: false, error: 'Ce compte est suspendu ou en attente de validation.' },
        { status: 403 }
      );
    }

    await supabase.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', data.user.id);

    logSecurityEvent({
      eventType: 'AUTH_LOGIN_SUCCESS',
      severity: 'INFO',
      ip,
      userIdentifier: profile.email,
      details: { role: profile.role },
    });

    return NextResponse.json({
      success: true,
      message: 'Connexion réussie',
      user: {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        role: profile.role,
        status: profile.status,
        studentProfile: profile.student_profiles ?? null,
        delegateProfile: profile.delegate_profiles ?? null,
      },
    });
  } catch (error) {
    logSecurityEvent({
      eventType: 'SYSTEM_ERROR',
      severity: 'ERROR',
      ip,
      details: { route: '/api/auth/login', error: (error as Error).message },
    });

    return NextResponse.json(
      { success: false, error: 'Une erreur est survenue lors de la tentative de connexion.' },
      { status: 500 }
    );
  }
}
