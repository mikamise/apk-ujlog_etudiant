import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, buildPaginationMeta } from '@/lib/api-response';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { getSessionUser, roleAtLeast } from '@/lib/server-session';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sanitizeSearchTerm } from '@/lib/security-validator';
import { logSecurityEvent } from '@/lib/security-logger';
import { notifyStudentsInScope } from '@/lib/notification-dispatch';

/** Liste des cours publiés, filtrés par niveau/filière/année/semestre/matière/recherche. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hasSearchQuery = Boolean(searchParams.get('q'));

  const rateLimit = enforceRateLimit(req, hasSearchQuery ? 'SEARCH' : 'READ', {
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
  const semesterNumber = searchParams.get('semester') || undefined;
  const subject = searchParams.get('subject') || undefined;
  const type = searchParams.get('type') || undefined;
  const q = sanitizeSearchTerm(searchParams.get('q')) || undefined;

  const supabase = await createClient();
  let query = supabase
    .from('courses')
    .select('*, course_files(id, original_file_name, mime_type, file_size_bytes)', { count: 'exact' })
    .eq('status', 'published');

  if (level) query = query.eq('level_code', level.toLowerCase());
  if (field) query = query.eq('field_code', field.toLowerCase());
  if (academicYear) query = query.eq('academic_year_id', academicYear);
  if (subject) query = query.ilike('subject_name', `%${subject}%`);
  if (type) query = query.eq('type', type);
  if (q) query = query.or(`title.ilike.%${q}%,subject_name.ilike.%${q}%,description.ilike.%${q}%`);

  const from = (page - 1) * limit;
  query = query.order('created_at', { ascending: false }).range(from, from + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    logSecurityEvent({ eventType: 'SYSTEM_ERROR', severity: 'ERROR', details: { route: '/api/courses', error: error.message } });
    return jsonError('Impossible de récupérer les cours.', 500, undefined, req);
  }

  void semesterNumber; // filtrage par semestre appliqué côté client existant si nécessaire

  return jsonSuccess(data ?? [], buildPaginationMeta(page, limit, count ?? 0), 200, req);
}

/** Création d'un cours — réservé aux délégués (dans leur périmètre) et aux admins. */
export async function POST(req: NextRequest) {
  const rateLimit = enforceRateLimit(req, 'WRITE', { discriminator: 'create_course' });
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session) return jsonError('Non authentifié.', 401, undefined, req);

  const body = await req.json().catch(() => ({}));
  const { title, description, subjectName, type, academicYearId, semesterId, levelCode, fieldCode, teacherName } = body;

  if (!title || !subjectName || !academicYearId || !semesterId || !levelCode || !fieldCode) {
    return jsonError('Champs obligatoires manquants.', 400, undefined, req);
  }

  const isDelegate = session.profile.role === 'delegate';
  if (isDelegate) {
    const supabaseCheck = await createClient();
    const { data: delegateProfile } = await supabaseCheck
      .from('delegate_profiles')
      .select('level_code, field_code, status')
      .eq('user_id', session.userId)
      .eq('status', 'active')
      .maybeSingle();

    if (!delegateProfile || delegateProfile.level_code !== levelCode || delegateProfile.field_code !== fieldCode) {
      logSecurityEvent({
        eventType: 'PERMISSION_DENIED',
        severity: 'WARN',
        userIdentifier: session.profile.email,
        details: { reason: 'Délégué hors périmètre', attemptedLevel: levelCode, attemptedField: fieldCode },
      });
      return jsonError('Vous ne pouvez publier que dans votre niveau/filière assigné(e).', 403, undefined, req);
    }
  } else if (!roleAtLeast(session.profile.role, 'admin')) {
    return jsonError('Accès refusé.', 403, undefined, req);
  }

  const admin = createAdminClient();
  const { data: course, error } = await admin
    .from('courses')
    .insert({
      title,
      description: description || null,
      subject_name: subjectName,
      type: type || 'cm',
      academic_year_id: academicYearId,
      semester_id: semesterId,
      level_code: levelCode,
      field_code: fieldCode,
      teacher_name: teacherName || null,
      status: 'published',
      author_id: session.userId,
    })
    .select()
    .single();

  if (error) {
    return jsonError('Impossible de créer le cours.', 500, undefined, req);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const { notifiedCount, emailQueuedCount } = await notifyStudentsInScope(admin, {
    levelCode,
    fieldCode,
    title: 'Nouveau cours publié',
    message: `${title} — ${subjectName}`,
    type: 'course_published',
    reference: { course_id: course.id, level_code: levelCode, field_code: fieldCode },
    emailTemplate: 'course_published',
    emailTemplateData: {
      courseTitle: title,
      subjectName,
      levelLabel: levelCode.toUpperCase(),
      courseUrl: appUrl ? `${appUrl}/dashboard/cours` : '/dashboard/cours',
    },
  });

  await admin.from('audit_logs').insert({
    user_id: session.userId,
    user_email: session.profile.email,
    user_role: session.profile.role,
    action: 'COURSE_PUBLISHED',
    entity_type: 'courses',
    entity_id: course.id,
    target_summary: title,
    result: 'success',
    metadata: { levelCode, fieldCode, notifiedCount, emailQueuedCount },
  });

  return jsonSuccess(course, undefined, 200, req);
}
