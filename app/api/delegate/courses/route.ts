import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { getSessionUser } from '@/lib/server-session';
import { createClient } from '@/lib/supabase/server';

/** Cours publiés PAR ce délégué (tous statuts confondus, y compris ses propres brouillons). */
export async function GET(req: NextRequest) {
  const rateLimit = enforceRateLimit(req, 'READ');
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session || session.profile.role !== 'delegate') {
    return jsonError('Accès refusé.', 403, undefined, req);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('courses')
    .select('*, course_files(id, original_file_name, file_size_bytes)')
    .eq('author_id', session.userId)
    .order('created_at', { ascending: false });

  if (error) return jsonError('Impossible de récupérer vos cours.', 500, undefined, req);
  return jsonSuccess(data ?? [], undefined, 200, req);
}
