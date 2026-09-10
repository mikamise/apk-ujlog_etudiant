import { NextResponse, NextRequest } from 'next/server';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { getSessionUser } from '@/lib/server-session';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const rateLimit = enforceRateLimit(req, 'READ');
  if (rateLimit) return rateLimit;
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ success: false, error: 'Non authentifié.' }, { status: 401 });

  const supabase = await createClient();
  const { data: full } = await supabase
    .from('profiles')
    .select(
      `id, email, first_name, last_name, role, status,
       student_profiles ( student_id, civility, level_code, field_code, academic_year_id, avatar_url ),
       delegate_profiles ( level_code, field_code, academic_year_id, status )`
    )
    .eq('id', session.userId)
    .single();

  return NextResponse.json({
    success: true,
    user: full
      ? {
          id: full.id,
          email: full.email,
          firstName: full.first_name,
          lastName: full.last_name,
          role: full.role,
          status: full.status,
          studentProfile: full.student_profiles ?? null,
          delegateProfile: full.delegate_profiles ?? null,
        }
      : null,
  });
}
