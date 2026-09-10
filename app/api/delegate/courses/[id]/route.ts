import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { getSessionUser } from '@/lib/server-session';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = enforceRateLimit(req, 'WRITE');
  if (rateLimit) return rateLimit;

  const { id } = await params;
  const session = await getSessionUser();
  if (!session || session.profile.role !== 'delegate') return jsonError('Accès refusé.', 403, undefined, req);

  const body = await req.json().catch(() => ({}));
  const supabase = await createClient();

  // RLS garantit qu'un délégué ne peut modifier que ses propres cours (author_id = auth.uid()).
  const { data, error } = await supabase
    .from('courses')
    .update({
      title: body.title,
      description: body.description,
      subject_name: body.subjectName,
      status: body.status,
    })
    .eq('id', id)
    .eq('author_id', session.userId)
    .select()
    .single();

  if (error || !data) return jsonError('Modification impossible (cours introuvable ou non autorisé).', 403, undefined, req);
  return jsonSuccess(data, undefined, 200, req);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = enforceRateLimit(req, 'WRITE');
  if (rateLimit) return rateLimit;

  const { id } = await params;
  const session = await getSessionUser();
  if (!session || session.profile.role !== 'delegate') return jsonError('Accès refusé.', 403, undefined, req);

  const supabase = await createClient();
  const { error } = await supabase.from('courses').delete().eq('id', id).eq('author_id', session.userId);
  if (error) return jsonError('Suppression impossible.', 500, undefined, req);
  return jsonSuccess({ deleted: true }, undefined, 200, req);
}
