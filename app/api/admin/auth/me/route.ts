import { NextResponse } from 'next/server';
import { getSessionUser, roleAtLeast } from '@/lib/server-session';

export async function GET() {
  const session = await getSessionUser();
  if (!session || !roleAtLeast(session.profile.role, 'admin')) {
    return NextResponse.json({ success: false, error: 'Non authentifié.' }, { status: 401, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' } });
  }
  return NextResponse.json({
    authenticated: true,
    success: true,
    user: {
      id: session.profile.id,
      email: session.profile.email,
      firstName: session.profile.first_name,
      lastName: session.profile.last_name,
      role: session.profile.role,
      status: session.profile.status,
    },
  }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' } });
}
