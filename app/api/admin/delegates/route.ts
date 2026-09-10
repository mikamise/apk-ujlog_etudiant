import { NextRequest } from 'next/server';
import { jsonError } from '@/lib/api-response';
import { getSessionUser, roleAtLeast } from '@/lib/server-session';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Liste réelle des délégués. La création d'un délégué ne se fait plus ici :
 * elle passe exclusivement par /api/admin/invitations (voir Étape 1 de la
 * migration). Cette route ne fait que lister/gérer les délégués existants.
 */
export async function GET(req: NextRequest) {
  const rateLimit = enforceRateLimit(req, 'ADMIN');
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session || !roleAtLeast(session.profile.role, 'admin')) {
    return jsonError('Accès refusé.', 403, undefined, req);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('delegate_profiles')
    .select('id, user_id, level_code, field_code, academic_year_id, status, assigned_at, revoked_at, profiles(email, first_name, last_name)')
    .order('assigned_at', { ascending: false });

  if (error) return jsonError('Impossible de récupérer les délégués.', 500, undefined, req);
  return NextResponse.json({ success: true, delegates: data ?? [] });
}
