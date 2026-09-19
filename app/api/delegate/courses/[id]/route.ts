import { NextRequest } from 'next/server';
import { z } from 'zod';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { getActiveDelegateProfile, getSessionUser, type DelegateProfileRow } from '@/lib/server-session';
import { createAdminClient } from '@/lib/supabase/server';
import { safeParseAuthBody } from '@/lib/auth-schemas';
import { toDbCourseType } from '@/lib/course-adapter';
import { countCourseFiles, notifyCoursePublished, resolveSemesterId } from '@/lib/course-publication';
import { getAppUrl } from '@/lib/auth-links';

type OwnedCourse = {
  id: string;
  title: string;
  subject_name: string;
  status: string;
  level_code: string;
  field_code: string;
  academic_year_id: string;
  author_id: string;
};

/**
 * Vérifie : rôle délégué, profil délégué ACTIF, cours dont il est l'auteur
 * ET toujours dans son périmètre. Un délégué révoqué ou réassigné ne peut
 * plus modifier ses anciens cours.
 */
async function loadOwnedCourse(req: NextRequest, id: string) {
  const session = await getSessionUser();
  if (!session || session.profile.role !== 'delegate') {
    return { error: jsonError('Accès refusé.', 403, undefined, req) } as const;
  }
  const admin = createAdminClient();
  const delegateProfile = await getActiveDelegateProfile(admin, session.userId);
  if (!delegateProfile) {
    return { error: jsonError('Statut de délégué introuvable ou révoqué.', 403, undefined, req) } as const;
  }
  const { data: course } = await admin
    .from('courses')
    .select('id, title, subject_name, status, level_code, field_code, academic_year_id, author_id')
    .eq('id', id)
    .maybeSingle();
  const owned = course as OwnedCourse | null;
  if (
    !owned ||
    owned.author_id !== session.userId ||
    owned.level_code !== delegateProfile.level_code ||
    owned.field_code !== delegateProfile.field_code
  ) {
    return { error: jsonError('Cours introuvable ou hors de votre périmètre.', 404, undefined, req) } as const;
  }
  return { session, admin, course: owned, delegateProfile: delegateProfile as DelegateProfileRow } as const;
}

const updateCourseSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  subjectName: z.string().trim().min(1).max(120).optional(),
  teacherName: z.string().trim().max(120).optional(),
  type: z.string().trim().max(40).optional(),
  semesterNumber: z.coerce.number().int().optional(),
  status: z.enum(['draft', 'published']).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = await enforceRateLimit(req, 'WRITE');
  if (rateLimit) return rateLimit;

  const { id } = await params;
  const loaded = await loadOwnedCourse(req, id);
  if ('error' in loaded) return loaded.error;
  const { session, admin, course } = loaded;

  const body = await req.json().catch(() => ({}));
  const parsed = safeParseAuthBody(updateCourseSchema, body);
  if (!parsed.success) return jsonError(parsed.error, 400, undefined, req);
  const input = parsed.data;

  const update: Record<string, unknown> = {};
  if (input.title !== undefined) update.title = input.title;
  if (input.description !== undefined) update.description = input.description || null;
  if (input.subjectName !== undefined) update.subject_name = input.subjectName;
  if (input.teacherName !== undefined) update.teacher_name = input.teacherName || null;
  if (input.type !== undefined) {
    const dbType = toDbCourseType(input.type);
    if (!dbType) return jsonError('Type de document invalide.', 400, undefined, req);
    update.type = dbType;
  }
  if (input.semesterNumber !== undefined) {
    const semesterId = await resolveSemesterId(admin, course.academic_year_id, input.semesterNumber);
    if (!semesterId) return jsonError('Semestre invalide (1 ou 2).', 400, undefined, req);
    update.semester_id = semesterId;
  }

  const isPublishing = input.status === 'published' && course.status !== 'published';
  if (input.status !== undefined) update.status = input.status;

  // Un cours publié sans aucun fichier est inutile pour les étudiants
  // (et déclencherait une notification vers un document vide).
  if (isPublishing && (await countCourseFiles(admin, course.id)) === 0) {
    return jsonError('Ajoutez au moins un fichier avant de publier ce cours.', 400, undefined, req);
  }

  if (Object.keys(update).length === 0) {
    return jsonError('Aucune modification fournie.', 400, undefined, req);
  }

  const { data, error } = await admin
    .from('courses')
    .update(update)
    .eq('id', course.id)
    .select('*, semesters(semester_number), course_files(id, original_file_name, file_size_bytes, mime_type)')
    .single();

  if (error || !data) return jsonError('Modification impossible.', 500, undefined, req);

  let notifiedCount = 0;
  if (isPublishing) {
    const result = await notifyCoursePublished(
      admin,
      {
        id: data.id,
        title: data.title,
        subject_name: data.subject_name,
        level_code: data.level_code,
        field_code: data.field_code,
      },
      getAppUrl(req)
    );
    notifiedCount = result.notifiedCount;
  }

  await admin.from('audit_logs').insert({
    user_id: session.userId,
    user_email: session.profile.email,
    user_role: session.profile.role,
    action: isPublishing ? 'COURSE_PUBLISHED' : 'COURSE_UPDATED',
    entity_type: 'courses',
    entity_id: course.id,
    target_summary: data.title,
    result: 'success',
    metadata: { fields: Object.keys(update), notifiedCount },
  });

  return jsonSuccess(data, { notifiedCount }, 200, req);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = await enforceRateLimit(req, 'WRITE');
  if (rateLimit) return rateLimit;

  const { id } = await params;
  const loaded = await loadOwnedCourse(req, id);
  if ('error' in loaded) return loaded.error;
  const { session, admin, course } = loaded;

  const { error } = await admin.from('courses').delete().eq('id', course.id);
  if (error) return jsonError('Suppression impossible.', 500, undefined, req);

  await admin.from('audit_logs').insert({
    user_id: session.userId,
    user_email: session.profile.email,
    user_role: session.profile.role,
    action: 'COURSE_DELETED',
    entity_type: 'courses',
    entity_id: course.id,
    target_summary: course.title,
    result: 'success',
  });

  return jsonSuccess({ deleted: true }, undefined, 200, req);
}
