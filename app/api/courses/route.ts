import { NextRequest } from 'next/server';
import { z } from 'zod';
import { jsonSuccess, jsonError, buildPaginationMeta } from '@/lib/api-response';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { getSessionUser, roleAtLeast } from '@/lib/server-session';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sanitizeSearchTerm } from '@/lib/security-validator';
import { logSecurityEvent } from '@/lib/security-logger';
import { safeParseAuthBody } from '@/lib/auth-schemas';
import { toDbCourseType } from '@/lib/course-adapter';
import { resolveSemesterId } from '@/lib/course-publication';
import { LEVEL_CODE_TO_LABEL, FIELD_CODE_TO_LABEL } from '@/lib/academic-reference';

/** Liste des cours publiés, filtrés par niveau/filière/année/semestre/matière/recherche. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hasSearchQuery = Boolean(searchParams.get('q'));

  const rateLimit = await enforceRateLimit(req, hasSearchQuery ? 'SEARCH' : 'READ', {
    discriminator: hasSearchQuery ? 'search_courses' : 'list_courses',
    customMessage: hasSearchQuery
      ? 'Trop de requêtes de recherche. Veuillez espacer vos recherches.'
      : 'Trop de requêtes de consultation. Veuillez patienter un instant.',
  });
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session) return jsonError('Non authentifié.', 401, undefined, req);

  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20));
  const level = searchParams.get('level') || undefined;
  const field = searchParams.get('field') || undefined;
  const academicYear = searchParams.get('academicYear') || undefined;
  const semesterNumber = Number(searchParams.get('semester')) || undefined;
  const subject = sanitizeSearchTerm(searchParams.get('subject')) || undefined;
  const type = searchParams.get('type') || undefined;
  const q = sanitizeSearchTerm(searchParams.get('q')) || undefined;

  // Filtre semestre : jointure interne pour ne garder que les cours du semestre demandé
  // (avant : paramètre lu puis ignoré).
  const semestersEmbed = semesterNumber === 1 || semesterNumber === 2 ? 'semesters!inner(semester_number)' : 'semesters(semester_number)';

  const supabase = await createClient();
  let query = supabase
    .from('courses')
    .select(`*, ${semestersEmbed}, course_files(id, original_file_name, mime_type, file_size_bytes)`, { count: 'exact' })
    .eq('status', 'published');

  if (semesterNumber === 1 || semesterNumber === 2) query = query.eq('semesters.semester_number', semesterNumber);
  if (level) query = query.eq('level_code', level.toLowerCase());
  if (field) query = query.eq('field_code', field.toLowerCase());
  if (academicYear) query = query.eq('academic_year_id', academicYear);
  if (subject) query = query.ilike('subject_name', `%${subject}%`);
  if (type) {
    const dbType = toDbCourseType(type);
    if (dbType) query = query.eq('type', dbType);
  }
  if (q) query = query.or(`title.ilike.%${q}%,subject_name.ilike.%${q}%,description.ilike.%${q}%`);

  const from = (page - 1) * limit;
  query = query.order('created_at', { ascending: false }).range(from, from + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    logSecurityEvent({ eventType: 'SYSTEM_ERROR', severity: 'ERROR', details: { route: '/api/courses', error: error.message } });
    return jsonError('Impossible de récupérer les cours.', 500, undefined, req);
  }

  return jsonSuccess(data ?? [], buildPaginationMeta(count ?? 0, page, limit), 200, req);
}

const adminCreateCourseSchema = z.object({
  title: z.string().trim().min(1, 'Le titre est obligatoire.').max(200),
  description: z.string().trim().max(2000).optional().default(''),
  subjectName: z.string().trim().min(1, 'La matière est obligatoire.').max(120),
  type: z.string().trim().max(40).default('cm'),
  academicYearId: z.string().trim().regex(/^\d{4}-\d{4}$/, 'Année universitaire invalide (ex. 2026-2027).'),
  semesterNumber: z.coerce.number().int().refine((n) => n === 1 || n === 2, 'Semestre invalide (1 ou 2).'),
  levelCode: z.string().trim().toLowerCase(),
  fieldCode: z.string().trim().toLowerCase(),
  teacherName: z.string().trim().max(120).optional().default(''),
});

/**
 * Création d'un cours par un admin — toujours en BROUILLON.
 * Les délégués passent par POST /api/delegate/courses (périmètre imposé
 * par le serveur). La publication (+ notification des étudiants) se fait
 * ensuite via PATCH /api/admin/courses/[id], une fois un fichier rattaché.
 */
export async function POST(req: NextRequest) {
  const rateLimit = await enforceRateLimit(req, 'WRITE', { discriminator: 'create_course' });
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session) return jsonError('Non authentifié.', 401, undefined, req);
  if (!roleAtLeast(session.profile.role, 'admin')) {
    return jsonError(
      session.profile.role === 'delegate' ? 'Les délégués publient via leur espace délégué.' : 'Accès refusé.',
      403,
      undefined,
      req
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = safeParseAuthBody(adminCreateCourseSchema, body);
  if (!parsed.success) return jsonError(parsed.error, 400, undefined, req);
  const input = parsed.data;

  if (!LEVEL_CODE_TO_LABEL[input.levelCode] || !FIELD_CODE_TO_LABEL[input.fieldCode]) {
    return jsonError('Niveau ou filière invalide.', 400, undefined, req);
  }
  const dbType = toDbCourseType(input.type);
  if (!dbType) return jsonError('Type de document invalide.', 400, undefined, req);

  const admin = createAdminClient();
  const semesterId = await resolveSemesterId(admin, input.academicYearId, input.semesterNumber);
  if (!semesterId) return jsonError('Semestre introuvable pour cette année universitaire.', 400, undefined, req);

  const { data: course, error } = await admin
    .from('courses')
    .insert({
      title: input.title,
      description: input.description || null,
      subject_name: input.subjectName,
      type: dbType,
      academic_year_id: input.academicYearId,
      semester_id: semesterId,
      level_code: input.levelCode,
      field_code: input.fieldCode,
      teacher_name: input.teacherName || null,
      status: 'draft',
      author_id: session.userId,
    })
    .select()
    .single();

  if (error || !course) {
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
    metadata: { levelCode: input.levelCode, fieldCode: input.fieldCode, status: 'draft' },
  });

  return jsonSuccess(course, undefined, 201, req);
}
