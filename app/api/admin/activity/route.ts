import { NextResponse } from 'next/server';
import { getSessionUser, roleAtLeast } from '@/lib/server-session';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { createAdminClient } from '@/lib/supabase/server';

/** Journal d'audit réel (audit_logs) — jamais de logs inventés. */
export async function GET(req: Request) {
  const rateLimit = enforceRateLimit(req, 'ADMIN');
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session || !roleAtLeast(session.profile.role, 'admin')) {
    return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50));

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('audit_logs')
    .select('id, user_email, user_role, action, entity_type, entity_id, target_summary, result, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ success: false, error: 'Impossible de récupérer le journal.' }, { status: 500 });
  return NextResponse.json({ success: true, data: { logs: data ?? [] } });
}
