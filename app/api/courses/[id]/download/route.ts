import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { getSessionUser } from '@/lib/server-session';
import { createAdminClient } from '@/lib/supabase/server';

/** Incrémente le compteur de téléchargements réel et renvoie l'URL réelle du/des fichier(s) Cloudinary. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const rateLimit = enforceRateLimit(req, 'READ', { discriminator: 'download_course' });
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session) return jsonError('Non authentifié.', 401, undefined, req);

  const admin = createAdminClient();
  const { data: course } = await admin
    .from('courses')
    .select('id, status, download_count, course_files(id, storage_key, original_file_name, mime_type)')
    .eq('id', id)
    .maybeSingle();

  if (!course || course.status !== 'published') return jsonError('Document introuvable.', 404, undefined, req);

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const rawFiles = (course.course_files ?? []) as { id: string; storage_key: string; original_file_name: string; mime_type: string }[];
  const files = rawFiles
    .filter((f) => Boolean(f.storage_key))
    .map((f) => ({
      id: f.id,
      name: f.original_file_name,
      mimeType: f.mime_type,
      // Livraison Cloudinary "raw" avec fl_attachment pour forcer le téléchargement (pas l'ouverture inline).
      url: cloudName
        ? `https://res.cloudinary.com/${cloudName}/raw/upload/fl_attachment/${f.storage_key}`
        : null,
    }));

  if (files.length === 0 || files.every((f) => !f.url)) {
    return jsonError('Aucun fichier téléchargeable n\'est disponible pour ce document.', 404, undefined, req);
  }

  await admin.from('courses').update({ download_count: (course.download_count || 0) + 1 }).eq('id', id);
  await admin.from('audit_logs').insert({
    user_id: session.userId,
    user_email: session.profile.email,
    user_role: session.profile.role,
    action: 'COURSE_DOWNLOADED',
    entity_type: 'courses',
    entity_id: id,
    result: 'success',
  });

  return jsonSuccess({ files }, undefined, 200, req);
}
