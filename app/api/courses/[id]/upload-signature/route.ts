import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { getSessionUser } from '@/lib/server-session';
import { createAdminClient } from '@/lib/supabase/server';
import {
  ALLOWED_COURSE_FILE_TYPES,
  MAX_COURSE_FILE_BYTES,
  getExtension,
  sanitizeFileName,
  generateUploadSignature,
} from '@/lib/cloudinary';

/**
 * Étape 1 du flux d'upload — voir Phase 5 §1 :
 * Frontend -> demande signature -> serveur vérifie utilisateur -> serveur
 * vérifie permission -> serveur génère signature limitée -> upload direct
 * Cloudinary. La clé secrète Cloudinary ne transite jamais ici.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params;

  const rateLimit = enforceRateLimit(req, 'WRITE', { discriminator: 'request_upload_signature' });
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session) return jsonError('Non authentifié.', 401, undefined, req);
  if (session.profile.role !== 'delegate' && session.profile.role !== 'admin' && session.profile.role !== 'super_admin') {
    return jsonError('Accès refusé.', 403, undefined, req);
  }

  const body = await req.json().catch(() => ({}));
  const fileName = String(body.fileName || '').trim();
  const mimeType = String(body.mimeType || '').trim();
  const fileSize = Number(body.fileSize || 0);

  if (!fileName || !mimeType) return jsonError('Nom de fichier et type MIME requis.', 400, undefined, req);

  const ext = getExtension(fileName);
  const expectedMime = ALLOWED_COURSE_FILE_TYPES[ext];
  if (!expectedMime || expectedMime !== mimeType) {
    return jsonError(
      'Format de fichier non autorisé. Formats acceptés : PDF, Word, PowerPoint, Excel, JPG, PNG.',
      400,
      undefined,
      req
    );
  }
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_COURSE_FILE_BYTES) {
    return jsonError('Le fichier dépasse la taille maximale autorisée (50 Mo).', 400, undefined, req);
  }

  // JAMAIS confiance en un courseId sans vérifier la propriété/le périmètre réels en base.
  const admin = createAdminClient();
  const { data: course } = await admin
    .from('courses')
    .select('id, author_id, level_code, field_code')
    .eq('id', courseId)
    .maybeSingle();

  if (!course) return jsonError('Cours introuvable.', 404, undefined, req);

  const isOwner = course.author_id === session.userId;
  const isAdmin = session.profile.role === 'admin' || session.profile.role === 'super_admin';
  if (!isOwner && !isAdmin) {
    return jsonError('Vous ne pouvez déposer un fichier que sur vos propres cours.', 403, undefined, req);
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return jsonError('Service de stockage indisponible.', 503, undefined, req);

  const safeName = sanitizeFileName(fileName);
  const isImage = mimeType.startsWith('image/');
  const resourceType = isImage ? 'image' : 'raw';
  const folder = `ujlog/courses/${courseId}`;
  const publicId = `${folder}/${Date.now()}-${safeName.replace(/\.[^.]+$/, '')}`;

  const signParams: Record<string, string | number> = {
    folder,
    public_id: publicId,
  };
  const { signature, timestamp } = generateUploadSignature(signParams);

  return jsonSuccess(
    {
      cloudName,
      apiKey: process.env.CLOUDINARY_API_KEY,
      timestamp,
      signature,
      folder,
      publicId,
      resourceType,
      safeFileName: safeName,
    },
    undefined,
    200,
    req
  );
}
