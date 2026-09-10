import { NextRequest } from 'next/server';
import { z } from 'zod';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { validatePassword } from '@/lib/security-validator';
import { safeParseAuthBody } from '@/lib/auth-schemas';
import { logSecurityEvent } from '@/lib/security-logger';
import { getSessionUser } from '@/lib/server-session';
import { createClient } from '@/lib/supabase/server';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Le mot de passe actuel est requis.').max(200),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères.').max(200),
});

export async function POST(req: NextRequest) {
  const rateLimit = enforceRateLimit(req, 'AUTH', { discriminator: 'change_password' });
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session) return jsonError('Non authentifié.', 401, undefined, req);

  const body = await req.json().catch(() => ({}));

  const zodCheck = safeParseAuthBody(changePasswordSchema, body);
  if (!zodCheck.success) return jsonError(zodCheck.error, 400, undefined, req);

  const { currentPassword, newPassword } = body;
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    return jsonError(passwordValidation.error || 'Nouveau mot de passe invalide.', 400, undefined, req);
  }

  const supabase = await createClient();

  // Revérifie le mot de passe actuel avant tout changement (defense in depth).
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: session.profile.email,
    password: currentPassword || '',
  });
  if (verifyError) {
    logSecurityEvent({
      eventType: 'AUTH_PASSWORD_CHANGE_FAILURE',
      severity: 'WARN',
      userIdentifier: session.profile.email,
      details: { reason: 'mot de passe actuel incorrect' },
    });
    return jsonError('Mot de passe actuel incorrect.', 401, undefined, req);
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return jsonError('Impossible de mettre à jour le mot de passe.', 500, undefined, req);

  logSecurityEvent({
    eventType: 'AUTH_PASSWORD_CHANGE_SUCCESS',
    severity: 'INFO',
    userIdentifier: session.profile.email,
  });

  return jsonSuccess({ updated: true }, undefined, 200, req);
}
