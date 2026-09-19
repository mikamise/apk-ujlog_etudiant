import { NextRequest, NextResponse } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { enforceDailyQuota, enforceRateLimit } from '@/lib/rate-limiter';
import { getSessionUser, roleAtLeast } from '@/lib/server-session';
import { createAdminClient } from '@/lib/supabase/server';
import { buildSignedDeliveryUrl, resourceTypeForMime } from '@/lib/cloudinary';

type FileRow = { id: string; storage_key: string; original_file_name: string; mime_type: string };

async function handleDownload(req: NextRequest, id: string, isGet: boolean) {
  const rateLimit = await enforceRateLimit(req, 'DOWNLOAD', { discriminator: 'download_course' });
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session) {
    if (isGet) {
      const url = new URL(req.url);
      return NextResponse.redirect(new URL(`/login?redirectTo=${encodeURIComponent(url.pathname)}`, req.url));
    }
    return jsonError('Non authentifié.', 401, undefined, req);
  }

  const quota = await enforceDailyQuota(req, 'DOWNLOAD', { userId: session.userId });
  if (quota) return quota;

  const admin = createAdminClient();
  const { data: course } = await admin
    .from('courses')
    .select('id, status, author_id, download_count, course_files(id, storage_key, original_file_name, mime_type)')
    .eq('id', id)
    .maybeSingle();

  const canSeeUnpublished =
    Boolean(course) && (course!.author_id === session.userId || roleAtLeast(session.profile.role, 'admin'));
  if (!course || (course.status !== 'published' && !canSeeUnpublished)) {
    return jsonError('Document introuvable.', 404, undefined, req);
  }

  let files: { id: string; name: string; mimeType: string; url: string | null }[];
  try {
    files = ((course.course_files ?? []) as FileRow[])
      .filter((f) => Boolean(f.storage_key))
      .map((f) => ({
        id: f.id,
        name: f.original_file_name,
        mimeType: f.mime_type,
        // Anciennes lignes contenant déjà une URL complète : conservées telles quelles.
        // Sinon : URL de livraison signée, avec le bon resource_type (image ou raw).
        url: /^https?:\/\//.test(f.storage_key)
          ? f.storage_key
          : buildSignedDeliveryUrl(f.storage_key, resourceTypeForMime(f.mime_type)),
      }));
  } catch {
    return jsonError('Service de stockage indisponible.', 503, undefined, req);
  }

  if (files.length === 0 || files.every((f) => !f.url)) {
    return jsonError('Aucun fichier téléchargeable n’est disponible pour ce document.', 404, undefined, req);
  }

  if (course.status === 'published') {
    // Incrément atomique (migration 0010) ; repli non atomique si la fonction n'existe pas encore.
    const { error: rpcError } = await admin.rpc('increment_course_download', { p_course_id: id });
    if (rpcError) {
      await admin.from('courses').update({ download_count: (course.download_count || 0) + 1 }).eq('id', id);
    }
    await admin.from('audit_logs').insert({
      user_id: session.userId,
      user_email: session.profile.email,
      user_role: session.profile.role,
      action: 'COURSE_DOWNLOADED',
      entity_type: 'courses',
      entity_id: id,
      result: 'success',
    });
  }

  const accept = req.headers.get('accept') || '';
  if (isGet && !accept.includes('application/json') && files[0]?.url) {
    return NextResponse.redirect(files[0].url);
  }

  return jsonSuccess({ files }, undefined, 200, req);
}

/** Incrémente le compteur de téléchargements réel et renvoie des liens signés. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleDownload(req, id, false);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleDownload(req, id, true);
}
