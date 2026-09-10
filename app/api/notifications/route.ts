import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, buildPaginationMeta } from '@/lib/api-response';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { getSessionUser } from '@/lib/server-session';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const rateLimit = enforceRateLimit(req, 'READ', { discriminator: 'list_notifications' });
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session) return jsonError('Non authentifié.', 401, undefined, req);

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 20));
  const from = (page - 1) * limit;

  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', session.userId)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  if (error) return jsonError('Impossible de récupérer les notifications.', 500, undefined, req);

  return jsonSuccess(data ?? [], buildPaginationMeta(page, limit, count ?? 0), 200, req);
}
