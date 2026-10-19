import { NextResponse } from 'next/server';
import { ACCOUNT_AUTH_LIMIT, enforcePayloadSize, enforceRateLimit, getClientIp } from '@/lib/rate-limiter';
import { validateEmail } from '@/lib/security-validator';
import { forgotPasswordSchema, safeParseAuthBody } from '@/lib/auth-schemas';
import { logSecurityEvent } from '@/lib/security-logger';
import { createAdminClient } from '@/lib/supabase/server';
import { sendVerificationEmail } from '@/lib/email';
import { buildConfirmEmailUrl, getAppUrl, type EmailLinkType } from '@/lib/auth-links';

/**
 * Renvoie l'e-mail de confirmation de compte (cas "je n'ai jamais reçu le
 * lien" ou "il a expiré"). Réponse volontairement générique — même logique
 * anti-énumération que /api/auth/forgot-password : on ne révèle jamais si
 * l'adresse correspond à un compte existant ou déjà confirmé.
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);

  const payloadCheck = enforcePayloadSize(req, 'AUTH');
  if (payloadCheck) return payloadCheck;

  const rateLimit = await enforceRateLimit(req, 'AUTH', {
    discriminator: 'resend_confirmation',
    customMessage: 'Trop de demandes. Veuillez patienter avant de réessayer.',
  });
  if (rateLimit) return rateLimit;

  const genericResponse = () =>
    NextResponse.json({
      success: true,
      message: 'Si un compte existe avec cette adresse et attend confirmation, un nouvel e-mail vient d’être envoyé.',
    });

  try {
    const body = await req.json().catch(() => ({}));

    const zodCheck = safeParseAuthBody(forgotPasswordSchema, body);
    if (!zodCheck.success) return genericResponse();

    const emailValidation = validateEmail(body.email);
    if (!emailValidation.isValid) return genericResponse();
    const cleanEmail = emailValidation.cleanEmail;

    const accountRateLimit = await enforceRateLimit(req, 'AUTH', {
      discriminator: `resend_confirmation_target_${cleanEmail}`,
      customMaxRequests: ACCOUNT_AUTH_LIMIT.maxRequests,
      global: true,
      customMessage: 'Trop de demandes pour ce compte. Veuillez patienter.',
    });
    if (accountRateLimit) return accountRateLimit;

    const admin = createAdminClient();

    // generateLink('magiclink') échoue si le compte n'existe pas : contrairement
    // à 'signup' (utilisé avant), il ne CRÉE jamais de compte pour une adresse
    // inconnue saisie par n'importe qui.
    const { data: probe, error: probeError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: cleanEmail,
    });
    const user = probe?.user;

    if (!user) {
      logSecurityEvent({
        eventType: 'AUTH_PASSWORD_RESET_REQUEST',
        severity: 'INFO',
        ip,
        userIdentifier: cleanEmail,
        details: { action: 'resend_confirmation', reason: probeError?.message || 'unknown_user' },
      });
      return genericResponse();
    }

    if (user.email_confirmed_at) {
      // Déjà confirmé : rien à envoyer, l'utilisateur peut se connecter.
      return genericResponse();
    }

    // Compte existant non confirmé : régénère un jeton de confirmation.
    let hashedToken = probe?.properties?.hashed_token;
    let linkType: EmailLinkType = 'magiclink';
    const { data: signupLink } = await admin.auth.admin.generateLink({ type: 'signup', email: cleanEmail } as never);
    const signupHashed = (signupLink as { properties?: { hashed_token?: string } } | null)?.properties?.hashed_token;
    if (signupHashed) {
      hashedToken = signupHashed;
      linkType = 'signup';
    }

    if (hashedToken) {
      try {
        await sendVerificationEmail(cleanEmail, buildConfirmEmailUrl(getAppUrl(req), hashedToken, linkType));
      } catch (emailErr) {
        logSecurityEvent({
          eventType: 'SYSTEM_ERROR',
          severity: 'ERROR',
          ip,
          userIdentifier: cleanEmail,
          details: { route: '/api/auth/resend-confirmation', step: 'send_verification_email', error: String(emailErr) },
        });
      }
    }

    return genericResponse();
  } catch {
    return genericResponse();
  }
}
