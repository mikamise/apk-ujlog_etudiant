import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { getSessionUser } from '@/lib/server-session';
import { createAdminClient } from '@/lib/supabase/server';
import { logSecurityEvent } from '@/lib/security-logger';

/**
 * Rapport annuel — Phase 8 §4. Réservé au SUPER ADMIN uniquement (pas
 * "admin" : "avec une autorisation appropriée" — un export global de
 * toutes les données de la plateforme sur une année entière est plus
 * sensible qu'une simple consultation de statistiques).
 *
 * Toutes les valeurs proviennent de vraies requêtes Supabase au moment
 * de l'appel — rien n'est précalculé ni inventé (Phase 8 §3).
 */
export async function GET(req: NextRequest) {
  const rateLimit = enforceRateLimit(req, 'ADMIN');
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session || session.profile.role !== 'super_admin') {
    return jsonError('Accès refusé. Réservé au Super Administrateur.', 403, undefined, req);
  }

  const { searchParams } = new URL(req.url);
  const academicYearId = searchParams.get('academicYearId');
  const format = searchParams.get('format') === 'csv' ? 'csv' : 'json';

  if (!academicYearId) return jsonError('academicYearId est obligatoire.', 400, undefined, req);

  const admin = createAdminClient();

  const { data: year } = await admin.from('academic_years').select('*').eq('id', academicYearId).maybeSingle();
  if (!year) return jsonError('Année académique introuvable.', 404, undefined, req);

  const [
    { data: coursesByLevel },
    { count: totalCourses },
    { count: publishedCourses },
    { data: coursesWithDownloads },
    { count: totalStudents },
    { count: activeDelegates },
  ] = await Promise.all([
    admin.from('courses').select('level_code, field_code, type').eq('academic_year_id', academicYearId),
    admin.from('courses').select('id', { count: 'exact', head: true }).eq('academic_year_id', academicYearId),
    admin.from('courses').select('id', { count: 'exact', head: true }).eq('academic_year_id', academicYearId).eq('status', 'published'),
    admin.from('courses').select('download_count').eq('academic_year_id', academicYearId),
    admin.from('student_profiles').select('user_id', { count: 'exact', head: true }),
    admin.from('delegate_profiles').select('id', { count: 'exact', head: true }).eq('academic_year_id', academicYearId).eq('status', 'active'),
  ]);

  // Agrégation par niveau — calculée ici sur les données réelles, jamais stockée en dur.
  const byLevel: Record<string, number> = {};
  for (const c of coursesByLevel ?? []) {
    byLevel[c.level_code] = (byLevel[c.level_code] ?? 0) + 1;
  }
  const totalDownloads = (coursesWithDownloads ?? []).reduce(
    (sum: number, c: { download_count: number | null }) => sum + (c.download_count || 0),
    0
  );

  const report = {
    academicYear: { id: year.id, name: year.name, status: year.status },
    generatedAt: new Date().toISOString(),
    totals: {
      totalCourses: totalCourses ?? 0,
      publishedCourses: publishedCourses ?? 0,
      totalDownloads,
      totalStudents: totalStudents ?? 0,
      activeDelegates: activeDelegates ?? 0,
    },
    coursesByLevel: byLevel,
  };

  await admin.from('audit_logs').insert({
    user_id: session.userId,
    user_email: session.profile.email,
    user_role: session.profile.role,
    action: 'DATA_EXPORT',
    entity_type: 'academic_years',
    entity_id: academicYearId,
    target_summary: `Rapport annuel ${year.name} (${format.toUpperCase()})`,
    result: 'success',
    metadata: { format, academicYearId },
  });
  logSecurityEvent({
    eventType: 'ADMIN_ACTION_PERFORMED',
    severity: 'INFO',
    userIdentifier: session.profile.email,
    details: { action: 'DATA_EXPORT', academicYearId, format },
  });

  if (format === 'csv') {
    const rows = [
      ['Rapport annuel', year.name],
      ['Généré le', report.generatedAt],
      [],
      ['Indicateur', 'Valeur'],
      ['Total cours', String(report.totals.totalCourses)],
      ['Cours publiés', String(report.totals.publishedCourses)],
      ['Téléchargements totaux', String(report.totals.totalDownloads)],
      ['Étudiants inscrits', String(report.totals.totalStudents)],
      ['Délégués actifs', String(report.totals.activeDelegates)],
      [],
      ['Niveau', 'Nombre de cours'],
      ...Object.entries(byLevel).map(([level, count]) => [level, String(count)]),
    ];
    const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="rapport-annuel-${academicYearId}.csv"`,
      },
    });
  }

  return jsonSuccess(report, undefined, 200, req);
}
