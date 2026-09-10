import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { getSessionUser, roleAtLeast } from '@/lib/server-session';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { createAdminClient } from '@/lib/supabase/server';

/** Révocation/réactivation, ou modification du périmètre (niveau/filière) d'un délégué. Jamais de suppression physique. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = enforceRateLimit(req, 'ADMIN');
  if (rateLimit) return rateLimit;

  const { id } = await params;
  const session = await getSessionUser();
  if (!session || !roleAtLeast(session.profile.role, 'admin')) {
    return jsonError('Accès refusé.', 403, undefined, req);
  }

  const body = await req.json().catch(() => ({}));
  const admin = createAdminClient();
  const update: Record<string, unknown> = {};
  let action = 'DELEGATE_UPDATED';

  if (body.status) {
    if (!['active', 'revoked'].includes(body.status)) {
      return jsonError('Statut invalide.', 400, undefined, req);
    }
    update.status = body.status;
    if (body.status === 'revoked') {
      update.revoked_at = new Date().toISOString();
      update.revoked_by = session.userId;
    }
    action = body.status === 'revoked' ? 'DELEGATE_REVOKED' : 'DELEGATE_REACTIVATED';
  }
  if (body.levelCode) update.level_code = body.levelCode;
  if (body.fieldCode) update.field_code = body.fieldCode;

  if (Object.keys(update).length === 0) {
    return jsonError('Aucune modification fournie.', 400, undefined, req);
  }

  const { data, error } = await admin.from('delegate_profiles').update(update).eq('id', id).select().single();
  if (error || !data) return jsonError('Délégué introuvable.', 404, undefined, req);

  await admin.from('audit_logs').insert({
    user_id: session.userId,
    user_email: session.profile.email,
    user_role: session.profile.role,
    action,
    entity_type: 'delegate_profiles',
    entity_id: id,
    result: 'success',
  });

  return jsonSuccess(data, undefined, 200, req);
}
