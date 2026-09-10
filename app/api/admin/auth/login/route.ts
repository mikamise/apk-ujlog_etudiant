import { NextResponse } from 'next/server';
import { enforcePayloadSize, enforceRateLimit, getClientIp } from '@/lib/rate-limiter';
import { validateEmail } from '@/lib/security-validator';
import { logSecurityEvent } from '@/lib/security-logger';
import { createClient } from '@/lib/supabase/server';

/**
 * Connexion Admin / Super Admin. Utilise exactement le même mécanisme
 * Supabase Auth que les étudiants : il n'existe plus de cookie ou de
 * mécanisme de session distinct et falsifiable pour l'administration.
 * L'autorisation est décidée uniquement par le rôle stocké dans la
 * table "profiles" (jamais par le frontend).
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);

  const payloadCheck = enforcePayloadSize(req, 'AUTH');
  if (payloadCheck) return payloadCheck;

  const rateLimit = enforceRateLimit(req, 'AUTH', {
    discriminator: 'admin_login',
    customMessage: 'Trop de tentatives de connexion administrateur. Veuillez patienter avant de réessayer.',
  });
  if (rateLimit) return rateLimit;

  try {
    const body = await req.json().catch(() => ({}));
    const { email, password } = body;

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid || !password) {
      return NextResponse.json(
        { success: false, error: 'Veuillez renseigner votre email et mot de passe administrateur.' },
        { status: 400 }
      );
    }

    const cleanEmail = emailValidation.cleanEmail;
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: String(password) });

    if (error || !data.user) {
      logSecurityEvent({
        eventType: 'AUTH_LOGIN_FAILURE',
        severity: 'WARN',
        ip,
        userIdentifier: cleanEmail,
        details: { target: 'admin_portal', reason: error?.message },
      });
      return NextResponse.json(
        { success: false, error: 'Identifiants administrateur incorrects ou accès refusé.' },
        { status: 401 }
      );
    }

    if (!data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { success: false, error: 'Veuillez confirmer votre adresse e-mail avant de vous connecter.' },
        { status: 403 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, status')
      .eq('id', data.user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      await supabase.auth.signOut();
      logSecurityEvent({
        eventType: 'PERMISSION_DENIED',
        severity: 'WARN',
        ip,
        userIdentifier: cleanEmail,
        details: { target: 'admin_portal', userRole: profile?.role, reason: 'Rôle non autorisé' },
      });
      return NextResponse.json(
        { success: false, error: 'Accès refusé. Ce compte ne possède pas de privilèges administratifs.' },
        { status: 403 }
      );
    }

    if (profile.status !== 'active') {
      await supabase.auth.signOut();
      return NextResponse.json(
        { success: false, error: 'Ce compte administrateur est suspendu.' },
        { status: 403 }
      );
    }

    await supabase.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', profile.id);

    logSecurityEvent({
      eventType: 'AUTH_LOGIN_SUCCESS',
      severity: 'INFO',
      ip,
      userIdentifier: cleanEmail,
      details: { role: profile.role, target: 'admin_portal' },
    });

    return NextResponse.json({
      success: true,
      message: 'Connexion administrateur réussie',
      user: {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        role: profile.role,
        status: profile.status,
      },
    });
  } catch (error) {
    logSecurityEvent({
      eventType: 'SYSTEM_ERROR',
      severity: 'ERROR',
      ip,
      details: { route: '/api/admin/auth/login', error: (error as Error).message },
    });
    return NextResponse.json(
      { success: false, error: 'Une erreur est survenue lors de l’authentification administrative.' },
      { status: 500 }
    );
  }
}
