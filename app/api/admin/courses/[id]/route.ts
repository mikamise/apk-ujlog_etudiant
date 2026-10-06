import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { getSessionUser, roleAtLeast } from '@/lib/server-session';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { createAdminClient } from '@/lib/supabase/server';
import { countCourseFiles, notifyCoursePublished } from '@/lib/course-publication';
import { getAppUrl } from '@/lib/auth-links';

/** Modération admin : changer le statut et/ou les métadonnées d'un cours. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = await enforceRateLimit(req, 'ADMIN');
  if (rateLimit) return rateLimit;

  const { id } = await params;
  const session = await getSessionUser();
  if (!session || !roleAtLeast(session.profile.role, 'admin')) {
    return jsonError('Accès refusé.', 403, undefined, req);
  }

  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};

  if (body.status) {
    if (!['draft', 'published', 'archived', 'deleted'].includes(body.status)) {
      return jsonError('Statut invalide.', 400, undefined, req);
    }
    update.status = body.status;
  }
  if (typeof body.title === 'string' && body.title.trim()) update.title = body.title.trim();
  if (typeof body.description === 'string') update.description = body.description;
  if (typeof body.subjectName === 'string' && body.subjectName.trim()) update.subject_name = body.subjectName.trim();
  if (typeof body.teacherName === 'string') update.teacher_name = body.teacherName;

  if (Object.keys(update).length === 0) {
    return jsonError('Aucune modification fournie.', 400, undefined, req);
  }

  const admin = createAdminClient();
  const { data: before } = await admin.from('courses').select('status').eq('id', id).maybeSingle();
  if (!before) return jsonError('Cours introuvable.', 404, undefined, req);

  const isPublishing = update.status === 'published' && before.status !== 'published';
  if (isPublishing && (await countCourseFiles(admin, id)) === 0) {
    return jsonError('Ajoutez au moins un fichier avant de publier ce cours.', 400, undefined, req);
  }

  const { data, error } = await admin.from('courses').update(update).eq('id', id).select().single();
  if (error || !data) return jsonError('Cours introuvable.', 404, undefined, req);

  if (isPublishing) {
    await notifyCoursePublished(admin, data, getAppUrl(req));
  }

  await admin.from('audit_logs').insert({
    user_id: session.userId,
    user_email: session.profile.email,
    user_role: session.profile.role,
    action: body.status ? 'COURSE_STATUS_CHANGED' : 'COURSE_METADATA_UPDATED',
    entity_type: 'courses',
    entity_id: id,
    result: 'success',
    metadata: update,
  });

  return jsonSuccess(data, undefined, 200, req);
}
