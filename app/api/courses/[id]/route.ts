import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { getSessionUser, roleAtLeast } from '@/lib/server-session';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = enforceRateLimit(req, 'READ');
  if (rateLimit) return rateLimit;

  const { id } = await params;
  const session = await getSessionUser();
  if (!session) return jsonError('Non authentifié.', 401, undefined, req);

  const supabase = await createClient();
  const { data: course, error } = await supabase
    .from('courses')
    .select('*, course_files(id, original_file_name, mime_type, file_size_bytes, storage_key)')
    .eq('id', id)
    .maybeSingle();

  if (error || !course) return jsonError('Cours introuvable.', 404, undefined, req);
  if (course.status !== 'published' && course.author_id !== session.userId && !roleAtLeast(session.profile.role, 'admin')) {
    return jsonError('Accès refusé.', 403, undefined, req);
  }

  return jsonSuccess(course, undefined, 200, req);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = enforceRateLimit(req, 'WRITE');
  if (rateLimit) return rateLimit;

  const { id } = await params;
  const session = await getSessionUser();
  if (!session) return jsonError('Non authentifié.', 401, undefined, req);

  const admin = createAdminClient();
  const { data: course } = await admin.from('courses').select('author_id, title').eq('id', id).maybeSingle();
  if (!course) return jsonError('Cours introuvable.', 404, undefined, req);

  if (course.author_id !== session.userId && !roleAtLeast(session.profile.role, 'admin')) {
    return jsonError('Accès refusé.', 403, undefined, req);
  }

  const { error } = await admin.from('courses').delete().eq('id', id);
  if (error) return jsonError('Suppression impossible.', 500, undefined, req);

  await admin.from('audit_logs').insert({
    user_id: session.userId,
    user_email: session.profile.email,
    user_role: session.profile.role,
    action: 'COURSE_DELETED',
    entity_type: 'courses',
    entity_id: id,
    target_summary: course.title,
    result: 'success',
  });

  return jsonSuccess({ deleted: true }, undefined, 200, req);
}
