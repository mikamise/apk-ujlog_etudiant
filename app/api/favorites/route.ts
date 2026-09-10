import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { getSessionUser } from '@/lib/server-session';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const rateLimit = enforceRateLimit(req, 'READ');
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session) return jsonError('Non authentifié.', 401, undefined, req);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('saved_courses')
    .select('id, created_at, courses(*)')
    .eq('user_id', session.userId)
    .order('created_at', { ascending: false });

  if (error) return jsonError('Impossible de récupérer vos favoris.', 500, undefined, req);
  return jsonSuccess(data ?? [], undefined, 200, req);
}

export async function POST(req: NextRequest) {
  const rateLimit = enforceRateLimit(req, 'WRITE');
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session) return jsonError('Non authentifié.', 401, undefined, req);

  const { courseId } = await req.json().catch(() => ({}));
  if (!courseId) return jsonError('courseId est obligatoire.', 400, undefined, req);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('saved_courses')
    .insert({ user_id: session.userId, course_id: courseId })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return jsonError('Ce cours est déjà dans vos favoris.', 409, undefined, req);
    return jsonError('Impossible d’ajouter ce favori.', 500, undefined, req);
  }
  return jsonSuccess(data, undefined, 200, req);
}
