import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { getSessionUser } from '@/lib/server-session';
import { createAdminClient } from '@/lib/supabase/server';
import { sanitizeString } from '@/lib/security-validator';
import { notifyStudentsInScope } from '@/lib/notification-dispatch';

/**
 * Annonce envoyée par un délégué à SES étudiants uniquement.
 *
 * SÉCURITÉ (Phase 6) : le niveau/filière ciblés ne sont JAMAIS lus dans le
 * corps de la requête — même si le client en envoyait un, il serait
 * ignoré. Le périmètre vient exclusivement de la ligne delegate_profiles
 * du délégué authentifié, relue en base à chaque appel. Un délégué ne
 * peut donc structurellement pas notifier un autre niveau/filière que le
 * sien, quel que soit le payload envoyé.
 */
export async function POST(req: NextRequest) {
  const rateLimit = enforceRateLimit(req, 'WRITE', { discriminator: 'delegate_announcement' });
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session) return jsonError('Non authentifié.', 401, undefined, req);
  if (session.profile.role !== 'delegate') return jsonError('Accès refusé.', 403, undefined, req);

  const admin = createAdminClient();
  const { data: delegateProfile } = await admin
    .from('delegate_profiles')
    .select('level_code, field_code, status')
    .eq('user_id', session.userId)
    .eq('status', 'active')
    .maybeSingle();

  if (!delegateProfile) {
    return jsonError('Statut de délégué introuvable ou inactif.', 403, undefined, req);
  }

  const body = await req.json().catch(() => ({}));
  const title = sanitizeString(body.title, 120);
  const message = sanitizeString(body.message, 500);
  if (!title || !message) return jsonError('Titre et message sont obligatoires.', 400, undefined, req);

  const { notifiedCount, emailQueuedCount } = await notifyStudentsInScope(admin, {
    // Toujours le périmètre RÉEL du délégué — jamais body.levelCode/fieldCode.
    levelCode: delegateProfile.level_code,
    fieldCode: delegateProfile.field_code,
    title,
    message,
    type: 'system',
    reference: { level_code: delegateProfile.level_code, field_code: delegateProfile.field_code, from: 'delegate' },
    emailTemplate: 'notification_broadcast',
    emailTemplateData: { title, message },
  });

  await admin.from('audit_logs').insert({
    user_id: session.userId,
    user_email: session.profile.email,
    user_role: session.profile.role,
    action: 'DELEGATE_ANNOUNCEMENT',
    entity_type: 'notifications',
    target_summary: title,
    result: 'success',
    metadata: {
      levelCode: delegateProfile.level_code,
      fieldCode: delegateProfile.field_code,
      notifiedCount,
      emailQueuedCount,
    },
  });

  return jsonSuccess({ sent: notifiedCount }, undefined, 200, req);
}
