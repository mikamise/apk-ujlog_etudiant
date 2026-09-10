import { NextResponse } from 'next/server';
import { enforcePayloadSize, enforceRateLimit, getClientIp } from '@/lib/rate-limiter';
import { validateEmail } from '@/lib/security-validator';
import { forgotPasswordSchema, safeParseAuthBody } from '@/lib/auth-schemas';
import { logSecurityEvent } from '@/lib/security-logger';
import { createAdminClient } from '@/lib/supabase/server';
import { sendVerificationEmail } from '@/lib/email';

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

  const rateLimit = enforceRateLimit(req, 'AUTH', {
    discriminator: 'resend_confirmation',
    customMessage: 'Trop de demandes. Veuillez patienter avant de réessayer.',
  });
  if (rateLimit) return rateLimit;

  const genericResponse = NextResponse.json({
    success: true,
    message: 'Si un compte existe avec cette adresse et attend confirmation, un nouvel e-mail vient d’être envoyé.',
  });

  try {
    const body = await req.json().catch(() => ({}));

    const zodCheck = safeParseAuthBody(forgotPasswordSchema, body);
    if (!zodCheck.success) return genericResponse;

    const emailValidation = validateEmail(body.email);
    if (!emailValidation.isValid) return genericResponse;

    const accountRateLimit = enforceRateLimit(req, 'AUTH', {
      discriminator: `resend_confirmation_target_${emailValidation.cleanEmail}`,
      customMessage: 'Trop de demandes pour ce compte. Veuillez patienter.',
    });
    if (accountRateLimit) return accountRateLimit;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const admin = createAdminClient();
    const { data: linkData, error } = await admin.auth.admin.generateLink({
      type: 'signup',
      email: emailValidation.cleanEmail,
      options: appUrl ? { redirectTo: `${appUrl}/login` } : undefined,
    });

    if (!error && linkData?.properties?.action_link) {
      try {
        await sendVerificationEmail(emailValidation.cleanEmail, linkData.properties.action_link);
      } catch (emailErr) {
        logSecurityEvent({
          eventType: 'SYSTEM_ERROR',
          severity: 'ERROR',
          ip,
          userIdentifier: emailValidation.cleanEmail,
          details: { route: '/api/auth/resend-confirmation', step: 'send_verification_email', error: String(emailErr) },
        });
      }
    }

    logSecurityEvent({
      eventType: 'AUTH_PASSWORD_RESET_REQUEST',
      severity: 'INFO',
      ip,
      userIdentifier: emailValidation.cleanEmail,
      details: { action: 'resend_confirmation', reason: error?.message },
    });

    return genericResponse;
  } catch {
    return genericResponse;
  }
}
