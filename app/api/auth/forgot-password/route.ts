import { NextResponse } from 'next/server';
import { ACCOUNT_AUTH_LIMIT, enforcePayloadSize, enforceRateLimit, getClientIp } from '@/lib/rate-limiter';
import { validateEmail } from '@/lib/security-validator';
import { forgotPasswordSchema, safeParseAuthBody } from '@/lib/auth-schemas';
import { logSecurityEvent } from '@/lib/security-logger';
import { createAdminClient } from '@/lib/supabase/server';
import { sendPasswordResetEmail } from '@/lib/email';
import { buildResetPasswordUrl, getAppUrl } from '@/lib/auth-links';

/**
 * Demande de réinitialisation de mot de passe.
 * Réponse volontairement IDENTIQUE que l'email existe ou non
 * (ne jamais révéler si une adresse possède un compte).
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);

  const payloadCheck = enforcePayloadSize(req, 'AUTH');
  if (payloadCheck) return payloadCheck;

  const rateLimit = await enforceRateLimit(req, 'AUTH', {
    discriminator: 'forgot_password',
    customMessage: 'Trop de demandes. Veuillez patienter avant de réessayer.',
  });
  if (rateLimit) return rateLimit;

  const genericResponse = NextResponse.json({
    success: true,
    message: 'Si un compte existe avec cette adresse, un e-mail de réinitialisation vient d’être envoyé.',
  });

  try {
    const body = await req.json().catch(() => ({}));

    // Couche 1 — validation Zod structurelle. Volontairement silencieuse :
    // même en cas d'échec, on renvoie la même réponse générique que pour
    // un email inconnu, pour ne jamais donner de signal distinct.
    const zodCheck = safeParseAuthBody(forgotPasswordSchema, body);
    if (!zodCheck.success) {
      return genericResponse;
    }

    const emailValidation = validateEmail(body.email);
    if (!emailValidation.isValid) {
      // Toujours répondre générique même si le format est invalide, pour ne pas
      // donner d'information exploitable à un script automatisé.
      return genericResponse;
    }

    const accountRateLimit = await enforceRateLimit(req, 'AUTH', {
      discriminator: `forgot_password_target_${emailValidation.cleanEmail}`,
      customMaxRequests: ACCOUNT_AUTH_LIMIT.maxRequests,
      global: true,
      customMessage: 'Trop de demandes pour ce compte. Veuillez patienter.',
    });
    if (accountRateLimit) return accountRateLimit;

    const admin = createAdminClient();
    // 'recovery' ne crée jamais de compte : erreur si l'adresse est inconnue.
    const { data: linkData, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: emailValidation.cleanEmail,
    });

    const hashedToken = linkData?.properties?.hashed_token;
    if (!error && hashedToken) {
      try {
        // Lien direct vers l'app : le jeton n'est vérifié qu'au moment où
        // l'utilisateur valide son nouveau mot de passe (voir /api/auth/reset-password).
        await sendPasswordResetEmail(emailValidation.cleanEmail, buildResetPasswordUrl(getAppUrl(req), hashedToken));
      } catch (emailErr) {
        logSecurityEvent({
          eventType: 'SYSTEM_ERROR',
          severity: 'ERROR',
          ip,
          userIdentifier: emailValidation.cleanEmail,
          details: { route: '/api/auth/forgot-password', step: 'send_reset_email', error: String(emailErr) },
        });
      }
    }

    if (error) {
      logSecurityEvent({
        eventType: 'AUTH_PASSWORD_RESET_REQUEST',
        severity: 'INFO',
        ip,
        userIdentifier: emailValidation.cleanEmail,
        details: { reason: error.message },
      });
    } else {
      logSecurityEvent({
        eventType: 'AUTH_PASSWORD_RESET_REQUEST',
        severity: 'INFO',
        ip,
        userIdentifier: emailValidation.cleanEmail,
        details: { sent: true },
      });
    }

    return genericResponse;
  } catch {
    return genericResponse;
  }
}
