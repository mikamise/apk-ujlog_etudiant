import { NextResponse, NextRequest } from 'next/server';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { getSessionUser } from '@/lib/server-session';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const rateLimit = enforceRateLimit(req, 'READ');
  if (rateLimit) return rateLimit;
  const session = await getSessionUser();
  if (!session || session.profile.role !== 'delegate') {
    return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: delegateProfile } = await supabase
    .from('delegate_profiles')
    .select('level_code, field_code')
    .eq('user_id', session.userId)
    .eq('status', 'active')
    .maybeSingle();

  if (!delegateProfile) {
    return NextResponse.json({ success: false, error: 'Profil délégué introuvable.' }, { status: 404 });
  }

  const { count: coursesCount } = await supabase
    .from('courses')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', session.userId);

  const { data: myCourses } = await supabase
    .from('courses')
    .select('download_count')
    .eq('author_id', session.userId);

  const totalDownloads = (myCourses ?? []).reduce((sum: number, c: { download_count: number }) => sum + (c.download_count || 0), 0);

  return NextResponse.json({
    success: true,
    stats: {
      scope: delegateProfile,
      coursesPublished: coursesCount ?? 0,
      totalDownloads,
    },
  });
}
