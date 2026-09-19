import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { enforceDailyQuota, enforceRateLimit } from '@/lib/rate-limiter';
import { getActiveDelegateProfile, getSessionUser, roleAtLeast } from '@/lib/server-session';
import { createAdminClient } from '@/lib/supabase/server';
import {
  COURSE_FILE_DELIVERY_TYPE,
  MAX_COURSE_FILE_BYTES,
  generateUploadSignature,
  isAllowedCourseFile,
  resourceTypeForMime,
  sanitizeFileName,
} from '@/lib/cloudinary';

/**
 * Étape 1 du flux d'upload :
 * navigateur -> demande signature -> serveur vérifie session, rôle et
 * périmètre -> signature limitée (public_id + type imposés) -> upload
 * direct navigateur -> Cloudinary. La clé secrète ne quitte jamais le serveur.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params;

  const rateLimit = await enforceRateLimit(req, 'UPLOAD', { discriminator: 'request_upload_signature' });
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session) return jsonError('Non authentifié.', 401, undefined, req);
  const isAdmin = roleAtLeast(session.profile.role, 'admin');
  if (session.profile.role !== 'delegate' && !isAdmin) {
    return jsonError('Accès refusé.', 403, undefined, req);
  }

  const quota = await enforceDailyQuota(req, 'UPLOAD', { userId: session.userId });
  if (quota) return quota;

  const body = await req.json().catch(() => ({}));
  const fileName = String(body.fileName || '').trim();
  const mimeType = String(body.mimeType || '').trim();
  const fileSize = Number(body.fileSize || 0);

  if (!fileName || !mimeType) return jsonError('Nom de fichier et type MIME requis.', 400, undefined, req);

  if (!isAllowedCourseFile(fileName, mimeType)) {
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

  if (!isAdmin) {
    const delegateProfile = await getActiveDelegateProfile(admin, session.userId);
    const inScope =
      delegateProfile &&
      course.author_id === session.userId &&
      course.level_code === delegateProfile.level_code &&
      course.field_code === delegateProfile.field_code;
    if (!inScope) {
      return jsonError('Vous ne pouvez déposer un fichier que sur vos propres cours.', 403, undefined, req);
    }
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  if (!cloudName || !apiKey) return jsonError('Service de stockage indisponible.', 503, undefined, req);

  const safeName = sanitizeFileName(fileName);
  const resourceType = resourceTypeForMime(mimeType);
  // Images : Cloudinary ajoute lui-même le format ; fichiers "raw" : l'extension
  // doit faire partie du public_id pour être conservée.
  const baseName = resourceType === 'image' ? safeName.replace(/\.[^.]+$/, '') : safeName;
  // public_id complet, sans paramètre `folder` en plus : Cloudinary
  // concaténerait folder + public_id et dupliquerait le chemin.
  const publicId = `ujlog/courses/${courseId}/${Date.now()}-${baseName}`;

  const { signature, timestamp } = generateUploadSignature({
    public_id: publicId,
    type: COURSE_FILE_DELIVERY_TYPE,
  });

  return jsonSuccess(
    {
      cloudName,
      apiKey,
      timestamp,
      signature,
      publicId,
      resourceType,
      deliveryType: COURSE_FILE_DELIVERY_TYPE,
      safeFileName: safeName,
    },
    undefined,
    200,
    req
  );
}
