import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { getSessionUser } from '@/lib/server-session';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = enforceRateLimit(req, 'WRITE');
  if (rateLimit) return rateLimit;

  const { id } = await params;
  const session = await getSessionUser();
  if (!session) return jsonError('Non authentifié.', 401, undefined, req);

  const supabase = await createClient();
  const { error } = await supabase.from('saved_courses').delete().eq('id', id).eq('user_id', session.userId);
  if (error) return jsonError('Suppression impossible.', 500, undefined, req);
  return jsonSuccess({ deleted: true }, undefined, 200, req);
}
