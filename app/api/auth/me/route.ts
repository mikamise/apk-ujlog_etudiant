import { NextResponse, NextRequest } from 'next/server';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { getSessionUser, serializeSessionUser } from '@/lib/server-session';

export async function GET(req: NextRequest) {
  const rateLimit = await enforceRateLimit(req, 'READ');
  if (rateLimit) return rateLimit;
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ success: false, error: 'Non authentifié.' }, { status: 401, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' } });

  return NextResponse.json({
    success: true,
    user: serializeSessionUser(session.profile),
  }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' } });
}
