import { NextResponse, NextRequest } from 'next/server';
import { getSessionUser, roleAtLeast } from '@/lib/server-session';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Statistiques 100% réelles, calculées à partir des tables Supabase.
 * Aucun chiffre n'est inventé : une base vide renvoie des compteurs à 0.
 */
export async function GET(req: NextRequest) {
  const rateLimit = enforceRateLimit(req, 'ADMIN');
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session || !roleAtLeast(session.profile.role, 'admin')) {
    return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
  }

  const admin = createAdminClient();

  const [{ count: studentsCount }, { count: delegatesCount }, { count: coursesCount }, { count: publishedCoursesCount }, { data: courses }] =
    await Promise.all([
      admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'delegate'),
      admin.from('courses').select('id', { count: 'exact', head: true }),
      admin.from('courses').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      admin.from('courses').select('download_count'),
    ]);

  const totalDownloads = (courses ?? []).reduce((sum: number, c: { download_count: number }) => sum + (c.download_count || 0), 0);

  const { data: byLevel } = await admin.from('student_profiles').select('level_code');
  const activeStudentsByLevel: Record<string, number> = {};
  for (const row of byLevel ?? []) {
    activeStudentsByLevel[row.level_code] = (activeStudentsByLevel[row.level_code] || 0) + 1;
  }

  return NextResponse.json({
    success: true,
    data: {
      studentsCount: studentsCount ?? 0,
      delegatesCount: delegatesCount ?? 0,
      coursesCount: coursesCount ?? 0,
      publishedCoursesCount: publishedCoursesCount ?? 0,
      totalDownloads,
      studentsByLevel: activeStudentsByLevel,
    },
  });
}
