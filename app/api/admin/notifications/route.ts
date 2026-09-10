import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { getSessionUser, roleAtLeast } from '@/lib/server-session';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { createAdminClient } from '@/lib/supabase/server';
import { sanitizeString } from '@/lib/security-validator';
import { notifyStudentsInScope } from '@/lib/notification-dispatch';

/**
 * Notification administrative CIBLÉE. Jamais de diffusion globale
 * implicite : le périmètre (niveau/filière) doit être fourni explicitement.
 */
export async function POST(req: NextRequest) {
  const rateLimit = enforceRateLimit(req, 'ADMIN');
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session || !roleAtLeast(session.profile.role, 'admin')) {
    return jsonError('Accès refusé.', 403, undefined, req);
  }

  const body = await req.json().catch(() => ({}));
  const title = sanitizeString(body.title, 120);
  const message = sanitizeString(body.message, 500);
  const scope = body.scope === 'all' ? 'all' : 'level';
  const levelCode = sanitizeString(body.levelCode, 20);
  const fieldCode = sanitizeString(body.fieldCode, 40);

  if (!title || !message) return jsonError('Titre et message sont obligatoires.', 400, undefined, req);
  if (scope === 'level' && (!levelCode || !fieldCode)) {
    return jsonError('Le niveau et la filière ciblés sont obligatoires, sauf en diffusion générale explicite.', 400, undefined, req);
  }

  const admin = createAdminClient();
  const { notifiedCount, emailQueuedCount } = await notifyStudentsInScope(admin, {
    scope,
    ...(scope === 'level' ? { levelCode, fieldCode } : {}),
    title,
    message,
    type: 'system',
    reference: scope === 'all' ? { scope: 'all' } : { level_code: levelCode, field_code: fieldCode },
    emailTemplate: 'notification_broadcast',
    emailTemplateData: { title, message },
  });

  if (notifiedCount === 0) {
    return jsonSuccess({ sent: 0, message: 'Aucun destinataire ne correspond à ce périmètre.' }, undefined, 200, req);
  }

  await admin.from('audit_logs').insert({
    user_id: session.userId,
    user_email: session.profile.email,
    user_role: session.profile.role,
    action: 'NOTIFICATION_BROADCAST',
    entity_type: 'notifications',
    target_summary: title,
    result: 'success',
    metadata: { scope, levelCode: scope === 'level' ? levelCode : null, fieldCode: scope === 'level' ? fieldCode : null, notifiedCount, emailQueuedCount },
  });

  return jsonSuccess({ sent: notifiedCount }, undefined, 200, req);
}
