'use client';

/**
 * Upload d'un document de cours (côté navigateur) en 3 étapes :
 * 1. POST /api/courses/[id]/upload-signature -> signature limitée
 * 2. upload direct navigateur -> Cloudinary (avec progression réelle)
 * 3. POST /api/courses/[id]/attach-file -> vérification serveur + rattachement
 *
 * Le fichier ne transite jamais par le serveur Next.js (pas de limite de
 * taille de requête Netlify/Vercel à contourner).
 */

export const ACCEPTED_COURSE_FILE_EXTENSIONS = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png';
export const MAX_COURSE_FILE_BYTES = 50 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
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

/**
 * Type MIME fiable à partir de l'extension : certains navigateurs/OS
 * (Windows notamment) renvoient un `file.type` vide ou différent pour les
 * fichiers Office, ce que le serveur refuserait.
 */
export function courseFileMimeType(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXTENSION[ext] ?? null;
}

/** Message d'erreur si le fichier est refusé, null s'il est acceptable. */
export function validateCourseFile(file: File): string | null {
  if (!courseFileMimeType(file)) {
    return 'Format non autorisé. Formats acceptés : PDF, Word, PowerPoint, Excel, JPG, PNG.';
  }
  if (file.size <= 0) return 'Le fichier est vide.';
  if (file.size > MAX_COURSE_FILE_BYTES) return 'Le fichier dépasse la taille maximale autorisée (50 Mo).';
  return null;
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.success) {
    throw new Error(payload?.error || `Erreur serveur (${res.status}).`);
  }
  return payload.data;
}

function uploadToCloudinary(
  url: string,
  form: FormData,
  onProgress?: (percent: number) => void
): Promise<{ public_id: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      let data: { public_id?: string; error?: { message?: string } } | null = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // ignore
      }
      if (xhr.status >= 200 && xhr.status < 300 && data?.public_id) {
        resolve({ public_id: data.public_id });
      } else if ((xhr.status === 401 || xhr.status === 403) && /permission/i.test(data?.error?.message ?? '')) {
        reject(
          new Error(
            'Le service de stockage refuse l’envoi : la clé API Cloudinary n’a pas la permission de déposer des fichiers. Un administrateur doit utiliser une clé avec les droits d’upload.'
          )
        );
      } else {
        reject(new Error(data?.error?.message ? `Stockage : ${data.error.message}` : 'Échec de l’envoi du fichier.'));
      }
    };
    xhr.onerror = () => reject(new Error('Erreur réseau pendant l’envoi du fichier.'));
    xhr.send(form);
  });
}

export async function uploadCourseFile(
  courseId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ id: string; original_file_name: string; file_size_bytes: number; mime_type: string }> {
  const validationError = validateCourseFile(file);
  if (validationError) throw new Error(validationError);
  const mimeType = courseFileMimeType(file)!;

  const signed = (await postJson(`/api/courses/${courseId}/upload-signature`, {
    fileName: file.name,
    mimeType,
    fileSize: file.size,
  })) as {
    cloudName: string;
    apiKey: string;
    timestamp: number;
    signature: string;
    publicId: string;
    resourceType: 'image' | 'raw';
    deliveryType: string;
  };

  // Les paramètres envoyés doivent correspondre EXACTEMENT à ceux signés côté serveur.
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', signed.apiKey);
  form.append('timestamp', String(signed.timestamp));
  form.append('signature', signed.signature);
  form.append('public_id', signed.publicId);
  form.append('type', signed.deliveryType);

  const uploaded = await uploadToCloudinary(
    `https://api.cloudinary.com/v1_1/${signed.cloudName}/${signed.resourceType}/upload`,
    form,
    onProgress
  );

  const attached = (await postJson(`/api/courses/${courseId}/attach-file`, {
    publicId: uploaded.public_id,
    originalFileName: file.name,
    resourceType: signed.resourceType,
  })) as { file: { id: string; original_file_name: string; file_size_bytes: number; mime_type: string } };

  return attached.file;
}
