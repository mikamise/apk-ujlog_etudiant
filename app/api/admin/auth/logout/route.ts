import { NextResponse } from 'next/server';
import { logSecurityEvent } from '@/lib/security-logger';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();

    logSecurityEvent({
      eventType: 'AUTH_LOGOUT',
      severity: 'INFO',
      details: { target: 'super_admin_portal' },
    });

    return NextResponse.json({ success: true, message: 'Déconnexion administrative réussie.' }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' } });
  } catch {
    return NextResponse.json({ success: false, error: 'Erreur lors de la déconnexion.' }, { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' } });
  }
}
