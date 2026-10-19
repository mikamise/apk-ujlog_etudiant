import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { getSessionUser, roleAtLeast } from '@/lib/server-session';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { createAdminClient } from '@/lib/supabase/server';
import { LEVEL_CODE_TO_LABEL, FIELD_CODE_TO_LABEL } from '@/lib/academic-reference';

/** Révocation/réactivation, ou modification du périmètre (niveau/filière) d'un délégué. Jamais de suppression physique. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = await enforceRateLimit(req, 'ADMIN');
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
  if (body.levelCode) {
    const levelCode = String(body.levelCode).toLowerCase();
    if (!LEVEL_CODE_TO_LABEL[levelCode]) return jsonError('Niveau invalide.', 400, undefined, req);
    update.level_code = levelCode;
  }
  if (body.fieldCode) {
    const fieldCode = String(body.fieldCode).toLowerCase();
    if (!FIELD_CODE_TO_LABEL[fieldCode]) return jsonError('Filière invalide.', 400, undefined, req);
    update.field_code = fieldCode;
  }
  if (body.status === 'active') {
    update.revoked_at = null;
    update.revoked_by = null;
  }

  if (Object.keys(update).length === 0) {
    return jsonError('Aucune modification fournie.', 400, undefined, req);
  }

  const { data, error } = await admin.from('delegate_profiles').update(update).eq('id', id).select().single();
  if (error || !data) return jsonError('Délégué introuvable.', 404, undefined, req);

  // Le rôle doit suivre le statut : avant, un délégué révoqué gardait
  // role = 'delegate' et donc l'accès aux routes /api/delegate/*.
  if (body.status) {
    const { data: userProfile } = await admin.from('profiles').select('role').eq('id', data.user_id).maybeSingle();
    if (body.status === 'revoked' && userProfile?.role === 'delegate') {
      const { count } = await admin
        .from('delegate_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', data.user_id)
        .eq('status', 'active');
      if (!count) {
        await admin.from('profiles').update({ role: 'student' }).eq('id', data.user_id);
      }
    } else if (body.status === 'active' && userProfile?.role === 'student') {
      await admin.from('profiles').update({ role: 'delegate' }).eq('id', data.user_id);
    }
  }

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
