import { NextResponse, NextRequest } from 'next/server';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { getSessionUser } from '@/lib/server-session';

export async function GET(req: NextRequest) {
  const rateLimit = enforceRateLimit(req, 'READ');
  if (rateLimit) return rateLimit;
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ success: false, error: 'Non authentifié.' }, { status: 401 });

  const full = session.profile;

  return NextResponse.json({
    success: true,
    user: {
      id: full.id,
      email: full.email,
      firstName: full.first_name,
      lastName: full.last_name,
      role: full.role,
      status: full.status,
      studentProfile: full.student_profiles ?? null,
      delegateProfile: full.delegate_profiles ?? null,
    },
  });
}
