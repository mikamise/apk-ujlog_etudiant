import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ success: true, message: 'Déconnexion réussie' }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' } });
}
