import type { createAdminClient } from '@/lib/supabase/server';
import { notifyStudentsInScope } from '@/lib/notification-dispatch';
import { LEVEL_CODE_TO_LABEL, FIELD_CODE_TO_LABEL } from '@/lib/academic-reference';
import { ensureAcademicYear } from '@/lib/server-session';

type AdminClient = ReturnType<typeof createAdminClient>;

/** Id du semestre (1 ou 2) d'une année, en créant l'année et ses semestres si besoin. */
export async function resolveSemesterId(
  admin: AdminClient,
  academicYearId: string,
  semesterNumber: number
): Promise<string | null> {
  if (semesterNumber !== 1 && semesterNumber !== 2) return null;
  await ensureAcademicYear(admin, academicYearId);
  const { data } = await admin
    .from('semesters')
    .select('id')
    .eq('academic_year_id', academicYearId)
    .eq('semester_number', semesterNumber)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export async function countCourseFiles(admin: AdminClient, courseId: string): Promise<number> {
  const { count } = await admin
    .from('course_files')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId);
  return count ?? 0;
}

/**
 * Notifie les étudiants du niveau/filière d'un cours qui vient de passer
 * en "published". À n'appeler qu'au moment de la TRANSITION vers publié
 * (jamais à la création d'un brouillon, jamais avant qu'un fichier soit
 * rattaché) — sinon les étudiants reçoivent une alerte pour un document
 * vide.
 */
export async function notifyCoursePublished(
  admin: AdminClient,
  course: { id: string; title: string; subject_name: string; level_code: string; field_code: string },
  appUrl: string
) {
  const levelLabel = LEVEL_CODE_TO_LABEL[course.level_code] ?? course.level_code.toUpperCase();
  const fieldLabel = FIELD_CODE_TO_LABEL[course.field_code] ?? course.field_code;
  return notifyStudentsInScope(admin, {
    levelCode: course.level_code,
    fieldCode: course.field_code,
    title: 'Nouveau cours publié',
    message: `${course.title} — ${course.subject_name}`,
    type: 'course_published',
    reference: { course_id: course.id, level_code: course.level_code, field_code: course.field_code },
    emailTemplate: 'course_published',
    emailTemplateData: {
      courseTitle: course.title,
      subjectName: course.subject_name,
      levelLabel: `${levelLabel} • ${fieldLabel}`,
      courseUrl: `${appUrl}/dashboard/cours`,
    },
  });
}
