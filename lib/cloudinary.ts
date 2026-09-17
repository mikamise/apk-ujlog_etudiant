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
  const fullParams: Record<string, string | number> = { ...params, timestamp };

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
 * Type de livraison Cloudinary utilisé pour les documents de cours.
 * 'authenticated' : le fichier n'a PAS d'URL publique res.cloudinary.com ;
 * il n'est accessible que via une URL de livraison signée générée par le
 * serveur après vérification de la session (voir buildSignedDeliveryUrl
 * et /api/courses/[id]/download).
 */
export const COURSE_FILE_DELIVERY_TYPE = 'authenticated';

export function resourceTypeForMime(mimeType: string): 'image' | 'raw' {
  return mimeType.startsWith('image/') ? 'image' : 'raw';
}

/** Type MIME déduit de l'extension, uniquement parmi les formats autorisés. */
export function mimeForFileName(fileName: string): string | null {
  return ALLOWED_COURSE_FILE_TYPES[getExtension(fileName)] ?? null;
}

function cloudinaryCredentials() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Configuration Cloudinary incomplète côté serveur.');
  }
  return { cloudName, apiKey, apiSecret };
}

/**
 * Après l'upload direct navigateur -> Cloudinary, on ne fait JAMAIS
 * confiance aux métadonnées (taille, format) renvoyées par le client :
 * on interroge directement l'API Admin Cloudinary pour obtenir les
 * vraies valeurs de la ressource qui existe réellement côté Cloudinary.
 */
export async function verifyUploadedResource(
  publicId: string,
  resourceType: 'image' | 'raw' = 'raw',
  deliveryType: string = COURSE_FILE_DELIVERY_TYPE
): Promise<{ bytes: number; format: string; exists: boolean }> {
  const { cloudName, apiKey, apiSecret } = cloudinaryCredentials();

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/resources/${resourceType}/${deliveryType}/${publicId
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`,
    { headers: { Authorization: `Basic ${auth}` } }
  );

  if (!res.ok) return { bytes: 0, format: '', exists: false };
  const data = await res.json();
  return { bytes: data.bytes ?? 0, format: data.format ?? '', exists: true };
}

/**
 * URL de livraison SIGNÉE pour un fichier "authenticated" (équivalent de
 * cloudinary.url(publicId, { sign_url: true, type: 'authenticated' }) du SDK).
 *
 * - Sans la clé secrète, impossible de construire l'URL à partir du seul
 *   public_id : lire `course_files.storage_key` ne suffit plus pour télécharger.
 * - L'URL n'est remise qu'à un utilisateur connecté (/api/courses/[id]/download).
 * - Servie par res.cloudinary.com (CORS ouvert) : compatible avec le
 *   téléchargement hors ligne (fetch + Cache Storage).
 * Limite : le lien n'expire pas (l'expiration nécessite l'option payante
 * "token-based authentication" de Cloudinary).
 */
export function buildSignedDeliveryUrl(
  publicId: string,
  resourceType: 'image' | 'raw',
  options: { deliveryType?: string; attachment?: boolean } = {}
): string {
  const { cloudName, apiSecret } = cloudinaryCredentials();
  const transformation = options.attachment === false ? '' : 'fl_attachment';
  const toSign = [transformation, publicId].filter(Boolean).join('/');
  const signature = crypto
    .createHash('sha1')
    .update(toSign + apiSecret, 'utf8')
    .digest('base64')
    .replace(/\//g, '_')
    .replace(/\+/g, '-')
    .substring(0, 8);
  const deliveryType = options.deliveryType ?? COURSE_FILE_DELIVERY_TYPE;
  return `https://res.cloudinary.com/${cloudName}/${resourceType}/${deliveryType}/s--${signature}--/${toSign}`;
}
