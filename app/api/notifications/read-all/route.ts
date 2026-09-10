import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { getSessionUser } from '@/lib/server-session';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const rateLimit = enforceRateLimit(req, 'WRITE');
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session) return jsonError('Non authentifié.', 401, undefined, req);

  const supabase = await createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', session.userId)
    .eq('is_read', false);

  if (error) return jsonError('Action impossible.', 500, undefined, req);
  return jsonSuccess({ updated: true }, undefined, 200, req);
}
