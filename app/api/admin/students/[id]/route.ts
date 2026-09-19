import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { getSessionUser, roleAtLeast } from '@/lib/server-session';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { createAdminClient } from '@/lib/supabase/server';
import { LEVEL_CODE_TO_LABEL, FIELD_CODE_TO_LABEL } from '@/lib/academic-reference';

const STATUS_MAP: Record<string, string> = {
  actif: 'active',
  active: 'active',
  suspendu: 'suspended',
  suspended: 'suspended',
};

/**
 * Suspend / réactive un compte étudiant, et/ou change son niveau/filière.
 * Ne supprime jamais le compte ni ses données.
 *
 * Changer le niveau d'un étudiant ne restreint pas l'accès aux cours
 * (migration 0008) : il détermine le ciblage des notifications — les
 * prochaines publications du nouveau niveau le notifieront.
 */
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

  // 1. Changement de statut (suspension/réactivation), inchangé.
  if (body.status !== undefined) {
    const dbStatus = STATUS_MAP[body.status];
    if (!dbStatus) return jsonError('Statut invalide.', 400, undefined, req);

    const { data, error } = await admin
      .from('profiles')
      .update({ status: dbStatus })
      .eq('id', id)
      .eq('role', 'student')
      .select()
      .single();

    if (error || !data) return jsonError('Étudiant introuvable.', 404, undefined, req);

    // Suspension réelle : sans ça, la session Supabase de l'étudiant restait
    // valide et utilisable directement contre l'API Supabase. Le bannissement
    // empêche toute reconnexion et tout rafraîchissement de session.
    await admin.auth.admin
      .updateUserById(id, { ban_duration: dbStatus === 'suspended' ? '876000h' : 'none' })
      .catch(() => undefined);

    await admin.from('audit_logs').insert({
      user_id: session.userId,
      user_email: session.profile.email,
      user_role: session.profile.role,
      action: dbStatus === 'suspended' ? 'STUDENT_SUSPENDED' : 'STUDENT_REACTIVATED',
      entity_type: 'profiles',
      entity_id: id,
      result: 'success',
    });

    return jsonSuccess(data, undefined, 200, req);
  }

  // 2. Changement de niveau/filière — vérifie que les codes existent
  // réellement (contrainte déjà garantie en base par la migration 0002,
  // mais on donne un message d'erreur clair plutôt qu'une erreur SQL brute).
  if (body.levelCode || body.fieldCode) {
    const update: Record<string, string> = {};
    if (body.levelCode) update.level_code = String(body.levelCode).toLowerCase();
    if (body.fieldCode) update.field_code = String(body.fieldCode).toLowerCase();
    if ((update.level_code && !LEVEL_CODE_TO_LABEL[update.level_code]) || (update.field_code && !FIELD_CODE_TO_LABEL[update.field_code])) {
      return jsonError('Niveau ou filière invalide.', 400, undefined, req);
    }

    const { data: studentProfile, error } = await admin
      .from('student_profiles')
      .update(update)
      .eq('user_id', id)
      .select('user_id, level_code, field_code')
      .single();

    if (error || !studentProfile) {
      return jsonError('Étudiant introuvable ou niveau/filière invalide.', 404, undefined, req);
    }

    await admin.from('audit_logs').insert({
      user_id: session.userId,
      user_email: session.profile.email,
      user_role: session.profile.role,
      action: 'STUDENT_LEVEL_CHANGED',
      entity_type: 'student_profiles',
      entity_id: id,
      result: 'success',
      metadata: { newLevelCode: studentProfile.level_code, newFieldCode: studentProfile.field_code },
    });

    return jsonSuccess(studentProfile, undefined, 200, req);
  }

  return jsonError('Aucune modification fournie.', 400, undefined, req);
}
