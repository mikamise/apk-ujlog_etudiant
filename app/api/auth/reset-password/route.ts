import { NextResponse } from 'next/server';
import { enforcePayloadSize, enforceRateLimit, getClientIp } from '@/lib/rate-limiter';
import { validatePassword } from '@/lib/security-validator';
import { resetPasswordSchema, safeParseAuthBody } from '@/lib/auth-schemas';
import { logSecurityEvent } from '@/lib/security-logger';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { createStatelessAuthClient } from '@/lib/auth-links';

const INVALID_LINK_ERROR = 'Lien de réinitialisation invalide ou expiré. Veuillez refaire une demande.';

/**
 * Finalise la réinitialisation depuis la page /reset-password.
 *
 * Deux cas :
 * 1. `token_hash` fourni (lien actuel /reset-password?token_hash=...) : le
 *    jeton est vérifié ICI, seulement après validation du nouveau mot de
 *    passe — un mot de passe refusé ne "brûle" donc pas le lien à usage unique.
 * 2. Pas de token_hash (anciens liens) : utilise la session "recovery"
 *    posée par /auth/callback.
 *
 * Dans les deux cas, toutes les sessions existantes sont fermées et
 * l'utilisateur doit se reconnecter avec son nouveau mot de passe.
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);

  const payloadCheck = enforcePayloadSize(req, 'AUTH');
  if (payloadCheck) return payloadCheck;

  const rateLimit = await enforceRateLimit(req, 'AUTH', {
    discriminator: 'reset_password',
    customMessage: 'Trop de tentatives. Veuillez patienter avant de réessayer.',
  });
  if (rateLimit) return rateLimit;

  try {
    const body = await req.json().catch(() => ({}));

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

    const admin = createAdminClient();
    const tokenHash = typeof body.token_hash === 'string' ? body.token_hash.trim() : '';

    let userId: string | null = null;
    let userEmail: string | undefined;
    let accessToken: string | undefined;

    if (tokenHash) {
      const { data, error } = await createStatelessAuthClient().auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery',
      });
      if (error || !data?.user) {
        logSecurityEvent({
          eventType: 'AUTH_PASSWORD_RESET_FAILURE',
          severity: 'INFO',
          ip,
          details: { reason: error?.message || 'invalid_token' },
        });
        return NextResponse.json({ success: false, error: INVALID_LINK_ERROR, code: 'INVALID_LINK' }, { status: 401 });
      }
      userId = data.user.id;
      userEmail = data.user.email;
      accessToken = data.session?.access_token;
    } else {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ success: false, error: INVALID_LINK_ERROR, code: 'INVALID_LINK' }, { status: 401 });
      }
      userId = user.id;
      userEmail = user.email;
      accessToken = (await supabase.auth.getSession()).data.session?.access_token;
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      password: body.newPassword,
    });

    if (updateError) {
      logSecurityEvent({
        eventType: 'AUTH_PASSWORD_RESET_FAILURE',
        severity: 'WARN',
        ip,
        userIdentifier: userEmail,
        details: { reason: updateError.message },
      });
      const samePassword = /different|same/i.test(updateError.message);
      return NextResponse.json(
        {
          success: false,
          error: samePassword
            ? 'Le nouveau mot de passe doit être différent de l’ancien.'
            : 'Impossible de mettre à jour le mot de passe. Réessayez.',
        },
        { status: 400 }
      );
    }

    // Déconnexion de toutes les sessions (y compris un éventuel voleur de session).
    if (accessToken) {
      await admin.auth.admin.signOut(accessToken, 'global').catch(() => undefined);
    }
    if (!tokenHash) {
      const supabase = await createClient();
      await supabase.auth.signOut().catch(() => undefined);
    }

    logSecurityEvent({
      eventType: 'AUTH_PASSWORD_RESET_SUCCESS',
      severity: 'INFO',
      ip,
      userIdentifier: userEmail,
    });

    return NextResponse.json({
      success: true,
      email: userEmail,
      message: 'Mot de passe mis à jour. Connectez-vous avec votre nouveau mot de passe.',
    });
  } catch (error) {
    logSecurityEvent({
      eventType: 'SYSTEM_ERROR',
      severity: 'ERROR',
      ip,
      details: { route: '/api/auth/reset-password', error: (error as Error).message },
    });
    return NextResponse.json({ success: false, error: 'Une erreur est survenue.' }, { status: 500 });
  }
}
