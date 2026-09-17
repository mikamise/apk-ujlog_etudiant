import { NextRequest } from 'next/server';
import { z } from 'zod';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { getActiveDelegateProfile, getSessionUser } from '@/lib/server-session';
import { createAdminClient } from '@/lib/supabase/server';
import { safeParseAuthBody } from '@/lib/auth-schemas';
import { toDbCourseType } from '@/lib/course-adapter';
import { resolveSemesterId } from '@/lib/course-publication';
import { logSecurityEvent } from '@/lib/security-logger';

/** Cours publiés PAR ce délégué (tous statuts confondus, y compris ses propres brouillons). */
export async function GET(req: NextRequest) {
  const rateLimit = await enforceRateLimit(req, 'READ');
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session || session.profile.role !== 'delegate') {
    return jsonError('Accès refusé.', 403, undefined, req);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('courses')
    .select('*, semesters(semester_number), course_files(id, original_file_name, file_size_bytes, mime_type)')
    .eq('author_id', session.userId)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false });

  if (error) return jsonError('Impossible de récupérer vos cours.', 500, undefined, req);
  return jsonSuccess(data ?? [], undefined, 200, req);
}

const createCourseSchema = z.object({
  title: z.string().trim().min(1, 'Le titre est obligatoire.').max(200),
  description: z.string().trim().max(2000).optional().default(''),
  subjectName: z.string().trim().min(1, 'La matière est obligatoire.').max(120),
  type: z.string().trim().max(40),
  semesterNumber: z.coerce.number().int().refine((n) => n === 1 || n === 2, 'Semestre invalide (1 ou 2).'),
  teacherName: z.string().trim().max(120).optional().default(''),
});

/**
 * POST /api/delegate/courses — crée un cours en BROUILLON dans le périmètre
 * du délégué.
 *
 * Le niveau, la filière et l'année ne sont JAMAIS lus dans le corps de la
 * requête : ils viennent du profil délégué actif relu en base. La
 * publication (et donc la notification des étudiants) se fait ensuite via
 * PATCH { status: 'published' }, une fois le fichier rattaché.
 */
export async function POST(req: NextRequest) {
  const rateLimit = await enforceRateLimit(req, 'WRITE', { discriminator: 'delegate_create_course' });
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session || session.profile.role !== 'delegate') {
    return jsonError('Accès refusé.', 403, undefined, req);
  }

  const admin = createAdminClient();
  const delegateProfile = await getActiveDelegateProfile(admin, session.userId);
  if (!delegateProfile) {
    return jsonError('Statut de délégué introuvable ou révoqué.', 403, undefined, req);
  }

  const body = await req.json().catch(() => ({}));
  const parsed = safeParseAuthBody(createCourseSchema, body);
  if (!parsed.success) return jsonError(parsed.error, 400, undefined, req);
  const input = parsed.data;

  const dbType = toDbCourseType(input.type);
  if (!dbType) return jsonError('Type de document invalide.', 400, undefined, req);

  const semesterId = await resolveSemesterId(admin, delegateProfile.academic_year_id, input.semesterNumber);
  if (!semesterId) {
    return jsonError('Semestre introuvable pour votre année universitaire.', 500, undefined, req);
  }

  const { data: course, error } = await admin
    .from('courses')
    .insert({
      title: input.title,
      description: input.description || null,
      subject_name: input.subjectName,
      type: dbType,
      academic_year_id: delegateProfile.academic_year_id,
      semester_id: semesterId,
      level_code: delegateProfile.level_code,
      field_code: delegateProfile.field_code,
      teacher_name: input.teacherName || null,
      status: 'draft',
      author_id: session.userId,
    })
    .select('*, semesters(semester_number)')
    .single();

  if (error || !course) {
    logSecurityEvent({
      eventType: 'SYSTEM_ERROR',
      severity: 'ERROR',
      userIdentifier: session.profile.email,
      details: { route: 'POST /api/delegate/courses', error: error?.message },
    });
    return jsonError('Impossible de créer le cours.', 500, undefined, req);
  }

  await admin.from('audit_logs').insert({
    user_id: session.userId,
    user_email: session.profile.email,
    user_role: session.profile.role,
    action: 'COURSE_CREATED',
    entity_type: 'courses',
    entity_id: course.id,
    target_summary: input.title,
    result: 'success',
    metadata: { levelCode: delegateProfile.level_code, fieldCode: delegateProfile.field_code, status: 'draft' },
  });

  return jsonSuccess(course, undefined, 201, req);
}
