import { NextResponse } from 'next/server';
import { enforceRateLimit, getClientIp } from '@/lib/rate-limiter';
import { logSecurityEvent } from '@/lib/security-logger';
import { createAdminClient } from '@/lib/supabase/server';
import { createStatelessAuthClient } from '@/lib/auth-links';
import { ensureUserProfile } from '@/lib/server-session';

const ALLOWED_TYPES = ['signup', 'email', 'magiclink'] as const;
type ConfirmType = (typeof ALLOWED_TYPES)[number];

/**
 * POST /api/auth/confirm-email — { token_hash, type }
 *
 * Confirme l'adresse e-mail à partir du lien reçu, SANS connecter
 * l'utilisateur : la vérification passe par un client Supabase sans
 * persistance (aucun cookie posé) et la session ainsi créée est
 * immédiatement révoquée. L'étudiant est ensuite renvoyé vers /login
 * pour saisir son e-mail et son mot de passe.
 *
 * Appelée en POST depuis la page /auth/confirm (et non directement par
 * le lien en GET) : les antivirus / scanners de messagerie qui "pré-ouvrent"
 * les liens ne consomment donc pas le jeton à usage unique.
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);

  const rateLimit = await enforceRateLimit(req, 'AUTH', {
    discriminator: 'confirm_email',
    customMessage: 'Trop de tentatives. Veuillez patienter avant de réessayer.',
  });
  if (rateLimit) return rateLimit;

  const body = await req.json().catch(() => ({}));
  const tokenHash = typeof body.token_hash === 'string' ? body.token_hash.trim() : '';
  const rawType = typeof body.type === 'string' ? body.type : 'signup';
  const type: ConfirmType = (ALLOWED_TYPES as readonly string[]).includes(rawType) ? (rawType as ConfirmType) : 'signup';

  if (!tokenHash || tokenHash.length > 512) {
    return NextResponse.json({ success: false, error: 'Lien de confirmation invalide.' }, { status: 400 });
  }

  const supabase = createStatelessAuthClient();

  // 'signup' est l'ancien nom de 'email' côté Supabase : on tente le type
  // annoncé, puis 'email' en repli (selon la version de GoTrue).
  let { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error && type !== 'email') {
    const retry = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
    if (!retry.error) {
      data = retry.data;
      error = null;
    }
  }

  if (error || !data?.user) {
    logSecurityEvent({
      eventType: 'AUTH_EMAIL_CONFIRMATION_FAILURE',
      severity: 'INFO',
      ip,
      details: { reason: error?.message },
    });
    return NextResponse.json(
      {
        success: false,
        error: 'Ce lien de confirmation est invalide, a déjà été utilisé ou a expiré. Si vous avez déjà confirmé votre compte, connectez-vous simplement.',
      },
      { status: 400 }
    );
  }

  // Filet de sécurité : garantit que le profil applicatif existe.
  await ensureUserProfile(data.user);

  // On ne veut PAS de session ouverte par ce lien : l'utilisateur se connecte
  // lui-même ensuite. Révocation de la session créée par verifyOtp.
  if (data.session?.access_token) {
    await createAdminClient()
      .auth.admin.signOut(data.session.access_token, 'local')
      .catch(() => undefined);
  }

  logSecurityEvent({
    eventType: 'AUTH_EMAIL_CONFIRMED',
    severity: 'INFO',
    ip,
    userIdentifier: data.user.email,
  });

  return NextResponse.json({
    success: true,
    email: data.user.email,
    message: 'Adresse e-mail confirmée. Vous pouvez maintenant vous connecter.',
  });
}
