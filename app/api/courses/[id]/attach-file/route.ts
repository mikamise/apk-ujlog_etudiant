import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { getActiveDelegateProfile, getSessionUser, roleAtLeast } from '@/lib/server-session';
import { createAdminClient } from '@/lib/supabase/server';
import { logSecurityEvent } from '@/lib/security-logger';
import {
  ALLOWED_COURSE_FILE_TYPES,
  MAX_COURSE_FILE_BYTES,
  mimeForFileName,
  verifyUploadedResource,
} from '@/lib/cloudinary';

/**
 * Étape 2 du flux d'upload : une fois le fichier envoyé directement du
 * navigateur à Cloudinary, on rattache la ligne course_files. Les
 * métadonnées du client (taille, format) ne sont jamais crues : elles sont
 * revérifiées auprès de l'API Admin Cloudinary. La propriété du cours est
 * revérifiée elle aussi — la signature de l'étape 1 ne suffit pas.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params;

  const rateLimit = await enforceRateLimit(req, 'UPLOAD', { discriminator: 'attach_course_file' });
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session) return jsonError('Non authentifié.', 401, undefined, req);
  const isAdmin = roleAtLeast(session.profile.role, 'admin');
  if (session.profile.role !== 'delegate' && !isAdmin) {
    return jsonError('Accès refusé.', 403, undefined, req);
  }

  const body = await req.json().catch(() => ({}));
  const publicId = String(body.publicId || '').trim();
  const originalFileName = String(body.originalFileName || '').trim().slice(0, 255);
  const resourceType: 'image' | 'raw' = body.resourceType === 'image' ? 'image' : 'raw';

  if (!publicId || !originalFileName) {
    return jsonError('Informations de fichier manquantes.', 400, undefined, req);
  }
  // Le public_id doit être sous le dossier de CE cours précis.
  if (!publicId.startsWith(`ujlog/courses/${courseId}/`) || publicId.includes('..')) {
    return jsonError('Fichier non associé à ce cours.', 403, undefined, req);
  }

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

  let verified: { bytes: number; format: string; exists: boolean };
  try {
    // Vérité terrain : on interroge Cloudinary lui-même, jamais les valeurs du client.
    verified = await verifyUploadedResource(publicId, resourceType);
  } catch {
    return jsonError('Service de stockage indisponible.', 503, undefined, req);
  }
  if (!verified.exists) {
    return jsonError('Le fichier n’a pas pu être vérifié sur le service de stockage.', 400, undefined, req);
  }
  if (verified.bytes <= 0 || verified.bytes > MAX_COURSE_FILE_BYTES) {
    return jsonError('Le fichier dépasse la taille maximale autorisée.', 400, undefined, req);
  }

  // Images : Cloudinary renvoie le format réel. Fichiers "raw" : format vide,
  // l'extension du public_id (imposée à l'étape 1) fait foi.
  const mimeType = (verified.format && ALLOWED_COURSE_FILE_TYPES[verified.format]) || mimeForFileName(publicId);
  if (!mimeType) {
    return jsonError('Format de fichier non autorisé.', 400, undefined, req);
  }

  const { data: fileRow, error } = await admin
    .from('course_files')
    .insert({
      course_id: courseId,
      storage_key: publicId,
      original_file_name: originalFileName,
      mime_type: mimeType,
      file_size_bytes: verified.bytes,
    })
    .select('id, original_file_name, file_size_bytes, mime_type, created_at')
    .single();

  if (error || !fileRow) return jsonError('Impossible d’enregistrer le fichier.', 500, undefined, req);

  logSecurityEvent({
    eventType: 'COURSE_MUTATION',
    severity: 'INFO',
    userIdentifier: session.profile.email,
    details: { action: 'COURSE_FILE_ATTACHED', courseId, fileId: fileRow.id, bytes: verified.bytes },
  });

  return jsonSuccess({ file: fileRow }, undefined, 200, req);
}
