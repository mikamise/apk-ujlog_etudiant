import { NextResponse, NextRequest } from 'next/server';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { getSessionUser } from '@/lib/server-session';

/**
 * La gestion fine des sessions actives multi-appareils est déléguée à
 * Supabase Auth. Cet endpoint confirme simplement l'état de la session
 * courante ; la révocation globale se fait via /api/auth/logout ou le
 * changement de mot de passe (qui invalide les sessions existantes).
 */
export async function GET(req: NextRequest) {
  const rateLimit = enforceRateLimit(req, 'READ');
  if (rateLimit) return rateLimit;
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ success: false, error: 'Non authentifié.' }, { status: 401 });
  return NextResponse.json({ success: true, session: { userId: session.userId, email: session.profile.email } });
}
