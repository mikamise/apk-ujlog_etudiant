import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { getSessionUser } from '@/lib/server-session';
import { createAdminClient } from '@/lib/supabase/server';
import { logSecurityEvent } from '@/lib/security-logger';
import { MAX_COURSE_FILE_BYTES, verifyUploadedResource } from '@/lib/cloudinary';

/**
 * Étape 2 du flux d'upload (Phase 5 §3) : une fois le fichier envoyé
 * directement au navigateur -> Cloudinary, on rattache la ligne
 * course_files. On NE FAIT JAMAIS confiance aux métadonnées envoyées par
 * le client (taille, format) : on les revérifie auprès de l'API Admin
 * Cloudinary elle-même avant d'écrire quoi que ce soit en base. On
 * revérifie aussi, une seconde fois, la propriété du cours — la
 * signature obtenue à l'étape 1 ne suffit pas à elle seule.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params;

  const rateLimit = enforceRateLimit(req, 'WRITE', { discriminator: 'attach_course_file' });
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session) return jsonError('Non authentifié.', 401, undefined, req);
  if (session.profile.role !== 'delegate' && session.profile.role !== 'admin' && session.profile.role !== 'super_admin') {
    return jsonError('Accès refusé.', 403, undefined, req);
  }

  const body = await req.json().catch(() => ({}));
  const publicId = String(body.publicId || '').trim();
  const originalFileName = String(body.originalFileName || '').trim().slice(0, 255);
  const resourceType: 'image' | 'raw' = body.resourceType === 'image' ? 'image' : 'raw';

  if (!publicId || !originalFileName) {
    return jsonError('Informations de fichier manquantes.', 400, undefined, req);
  }
  // Le public_id doit être sous le dossier de CE cours précis — empêche de
  // rattacher à ce cours un fichier uploadé (avec une autre signature) pour
  // un cours différent.
  if (!publicId.startsWith(`ujlog/courses/${courseId}/`)) {
    return jsonError('Fichier non associé à ce cours.', 403, undefined, req);
  }

  const admin = createAdminClient();
  const { data: course } = await admin
    .from('courses')
    .select('id, author_id')
    .eq('id', courseId)
    .maybeSingle();

  if (!course) return jsonError('Cours introuvable.', 404, undefined, req);

  const isOwner = course.author_id === session.userId;
  const isAdmin = session.profile.role === 'admin' || session.profile.role === 'super_admin';
  if (!isOwner && !isAdmin) {
    return jsonError('Vous ne pouvez déposer un fichier que sur vos propres cours.', 403, undefined, req);
  }

  // Vérité terrain : on interroge Cloudinary lui-même, jamais les valeurs du client.
  const verified = await verifyUploadedResource(publicId, resourceType);
  if (!verified.exists) {
    return jsonError('Le fichier n’a pas pu être vérifié sur le service de stockage.', 400, undefined, req);
  }
  if (verified.bytes <= 0 || verified.bytes > MAX_COURSE_FILE_BYTES) {
    return jsonError('Le fichier dépasse la taille maximale autorisée.', 400, undefined, req);
  }

  const mimeByFormat: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
  };
  const mimeType = mimeByFormat[verified.format] || (resourceType === 'image' ? 'image/jpeg' : 'application/octet-stream');

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
