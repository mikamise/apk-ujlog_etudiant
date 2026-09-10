import crypto from 'crypto';

/**
 * Formats autorisés pour les documents de cours. Liste blanche stricte —
 * tout le reste (exécutables, scripts, archives, etc.) est refusé, à la
 * fois côté extension ET côté MIME type (les deux doivent concorder).
 */
export const ALLOWED_COURSE_FILE_TYPES: Record<string, string> = {
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

export const MAX_COURSE_FILE_BYTES = 50 * 1024 * 1024; // 50 Mo

export function getExtension(fileName: string): string {
  const parts = fileName.trim().toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

/**
 * Vérifie que l'extension ET le type MIME annoncés correspondent tous les
 * deux à un format de la liste blanche (empêche par exemple un ".exe"
 * renommé en ".pdf", ou un mime type falsifié qui ne correspond pas à
 * l'extension déclarée).
 */
export function isAllowedCourseFile(fileName: string, mimeType: string): boolean {
  const ext = getExtension(fileName);
  const expectedMime = ALLOWED_COURSE_FILE_TYPES[ext];
  return Boolean(expectedMime) && expectedMime === mimeType;
}

/**
 * Nom de fichier sécurisé : retire tout ce qui pourrait servir à de la
 * traversée de chemin ou de l'injection, garde juste des caractères
 * alphanumériques, tirets, underscores et le point d'extension.
 */
export function sanitizeFileName(fileName: string): string {
  const ext = getExtension(fileName);
  const base = fileName
    .trim()
    .slice(0, fileName.lastIndexOf('.') > 0 ? fileName.lastIndexOf('.') : undefined)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // accents
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return ext ? `${base || 'document'}.${ext}` : base || 'document';
}

/**
 * Signature d'upload Cloudinary — génère une signature HMAC-SHA1 valable
 * uniquement pour les paramètres exacts fournis (dossier, format imposé,
 * timestamp court). La clé secrète Cloudinary ne quitte jamais le serveur ;
 * seule cette signature (à usage limité) est renvoyée au navigateur.
 */
export function generateUploadSignature(params: Record<string, string | number>): {
  signature: string;
  timestamp: number;
} {
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!apiSecret) throw new Error('CLOUDINARY_API_SECRET manquant côté serveur.');

  const timestamp = Math.floor(Date.now() / 1000);
  const fullParams = { ...params, timestamp };

  const toSign = Object.keys(fullParams)
    .sort()
    .map((key) => `${key}=${fullParams[key]}`)
    .join('&');

  const signature = crypto
    .createHash('sha1')
    .update(toSign + apiSecret)
    .digest('hex');

  return { signature, timestamp };
}

/**
 * Après l'upload direct navigateur -> Cloudinary, on ne fait JAMAIS
 * confiance aux métadonnées (taille, format) renvoyées par le client :
 * on interroge directement l'API Admin Cloudinary pour obtenir les
 * vraies valeurs de la ressource qui existe réellement côté Cloudinary.
 */
export async function verifyUploadedResource(
  publicId: string,
  resourceType: 'image' | 'raw' = 'raw'
): Promise<{ bytes: number; format: string; exists: boolean }> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Configuration Cloudinary incomplète côté serveur.');
  }

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/resources/${resourceType}/upload/${encodeURIComponent(publicId)}`,
    { headers: { Authorization: `Basic ${auth}` } }
  );

  if (!res.ok) return { bytes: 0, format: '', exists: false };
  const data = await res.json();
  return { bytes: data.bytes ?? 0, format: data.format ?? '', exists: true };
}
