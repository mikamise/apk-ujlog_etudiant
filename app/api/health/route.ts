import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from('academic_years').select('id').limit(1);
    return NextResponse.json({
      success: true,
      status: 'ok',
      database: error ? 'unreachable' : 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ success: false, status: 'error' }, { status: 503 });
  }
}
