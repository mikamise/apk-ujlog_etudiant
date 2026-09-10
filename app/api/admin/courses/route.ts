import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, buildPaginationMeta } from '@/lib/api-response';
import { getSessionUser, roleAtLeast } from '@/lib/server-session';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { createAdminClient } from '@/lib/supabase/server';

/** Vue admin de TOUS les cours (tous statuts), pas seulement les publiés. */
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

  const admin = createAdminClient();
  const { data, error, count } = await admin
    .from('courses')
    .select('*, profiles(first_name, last_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  if (error) return jsonError('Impossible de récupérer les cours.', 500, undefined, req);
  return jsonSuccess(data ?? [], buildPaginationMeta(page, limit, count ?? 0), 200, req);
}
