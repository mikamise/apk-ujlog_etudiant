import { NextRequest } from 'next/server';
import { jsonError, buildPaginationMeta } from '@/lib/api-response';
import { NextResponse } from 'next/server';
import { getSessionUser, roleAtLeast } from '@/lib/server-session';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { createAdminClient } from '@/lib/supabase/server';
import { sanitizeSearchTerm } from '@/lib/security-validator';

/** Liste réelle des étudiants inscrits — aucune donnée fictive, table vide = liste vide. */
export async function GET(req: NextRequest) {
  const rateLimit = enforceRateLimit(req, 'ADMIN');
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session || !roleAtLeast(session.profile.role, 'admin')) {
    return jsonError('Accès refusé.', 403, undefined, req);
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 25));
  const from = (page - 1) * limit;
  const q = sanitizeSearchTerm(searchParams.get('q')) || undefined;

  const admin = createAdminClient();
  let query = admin
    .from('profiles')
    .select('id, email, first_name, last_name, status, created_at, last_login_at, student_profiles(student_id, level_code, field_code, academic_year_id)', {
      count: 'exact',
    })
    .eq('role', 'student');

  if (q) query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`);

  const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, from + limit - 1);
  if (error) return jsonError('Impossible de récupérer les étudiants.', 500, undefined, req);

  return NextResponse.json({
    success: true,
    data: { students: data ?? [] },
    meta: buildPaginationMeta(page, limit, count ?? 0),
  });
}
