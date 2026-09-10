import { NextResponse } from 'next/server';
import { enforcePayloadSize, enforceRateLimit, getClientIp } from '@/lib/rate-limiter';
import { validatePassword } from '@/lib/security-validator';
import { resetPasswordSchema, safeParseAuthBody } from '@/lib/auth-schemas';
import { logSecurityEvent } from '@/lib/security-logger';
import { createClient } from '@/lib/supabase/server';

/**
 * Finalise la réinitialisation : appelée depuis la page /reset-password
 * une fois que l'utilisateur a suivi le lien reçu par e-mail (Supabase a
 * déjà vérifié le token et ouvert une session temporaire de type "recovery").
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);

  const payloadCheck = enforcePayloadSize(req, 'AUTH');
  if (payloadCheck) return payloadCheck;

  const rateLimit = enforceRateLimit(req, 'AUTH', {
    discriminator: 'reset_password',
    customMessage: 'Trop de tentatives. Veuillez patienter avant de réessayer.',
  });
  if (rateLimit) return rateLimit;

  try {
    const body = await req.json().catch(() => ({}));

    // Couche 1 — validation Zod structurelle.
    const zodCheck = safeParseAuthBody(resetPasswordSchema, body);
    if (!zodCheck.success) {
      return NextResponse.json({ success: false, error: zodCheck.error }, { status: 400 });
    }

    const passwordValidation = validatePassword(body.newPassword);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.error || 'Mot de passe invalide.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Nécessite la session "recovery" posée par le lien e-mail Supabase.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Lien de réinitialisation invalide ou expiré. Veuillez refaire une demande.',
        },
        { status: 401 }
      );
    }

    const { error } = await supabase.auth.updateUser({ password: body.newPassword });
    if (error) {
      logSecurityEvent({
        eventType: 'AUTH_PASSWORD_RESET_FAILURE',
        severity: 'WARN',
        ip,
        userIdentifier: user.email,
        details: { reason: error.message },
      });
      return NextResponse.json(
        { success: false, error: 'Impossible de mettre à jour le mot de passe. Réessayez.' },
        { status: 400 }
      );
    }

    logSecurityEvent({
      eventType: 'AUTH_PASSWORD_RESET_SUCCESS',
      severity: 'INFO',
      ip,
      userIdentifier: user.email,
    });

    return NextResponse.json({ success: true, message: 'Mot de passe mis à jour avec succès.' });
  } catch (error) {
    logSecurityEvent({
      eventType: 'SYSTEM_ERROR',
      severity: 'ERROR',
      ip,
      details: { route: '/api/auth/reset-password', error: (error as Error).message },
    });
    return NextResponse.json(
      { success: false, error: 'Une erreur est survenue.' },
      { status: 500 }
    );
  }
}
