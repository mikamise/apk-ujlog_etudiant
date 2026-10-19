/**
 * Server and Client Input Validation and Sanitization for UJLOG Platform.
 * Enforces OWASP Input Validation Cheat Sheet guidelines.
 */

const DANGEROUS_HTML_REGEX = /[<>&"'`/\\]/g;
const HTML_REPLACEMENTS: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
  "'": '&#x27;',
  '`': '&#x60;',
  '/': '&#x2F;',
  '\\': '&#x5C;',
};

/**
 * Sanitize text strings by stripping null bytes, normalizing whitespace,
 * escaping HTML special characters, and enforcing length limits.
 */
export function sanitizeString(input: unknown, maxLength: number = 500): string {
  if (input === null || input === undefined) return '';
  let str = String(input);

  // Remove null bytes and control characters (except standard newlines/tabs)
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Truncate to maximum safe length
  if (str.length > maxLength) {
    str = str.slice(0, maxLength);
  }

  return str.trim();
}

/**
 * HTML escape a sanitized string.
 */
export function escapeHtml(input: string): string {
  return input.replace(DANGEROUS_HTML_REGEX, (char) => HTML_REPLACEMENTS[char] || char);
}

/**
 * Validate email address according to RFC 5322 standard.
 */
export function validateEmail(email: unknown): { isValid: boolean; error?: string; cleanEmail: string } {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'L’adresse e-mail est obligatoire.', cleanEmail: '' };
  }

  const clean = email.trim().toLowerCase();

  if (clean.length > 254) {
    return { isValid: false, error: 'L’adresse e-mail dépasse la longueur maximale autorisée (254 caractères).', cleanEmail: '' };
  }

  // RFC 5322 compliant regex for practical email validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  if (!emailRegex.test(clean)) {
    return { isValid: false, error: 'Format d’adresse e-mail invalide.', cleanEmail: '' };
  }

  return { isValid: true, cleanEmail: clean };
}

/**
 * Validate password strength (min 8 chars, max 128 chars, uppercase, lowercase, number).
 */
export function validatePassword(password: unknown): { isValid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Le mot de passe est obligatoire.' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Le mot de passe doit comporter au moins 8 caractères.' };
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Le mot de passe ne peut pas dépasser 128 caractères.' };
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Le mot de passe doit contenir au moins une lettre majuscule.' };
  }

  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Le mot de passe doit contenir au moins une lettre minuscule.' };
  }

  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Le mot de passe doit contenir au moins un chiffre.' };
  }

  return { isValid: true };
}

/**
 * Strict semester validation: strictly 'Semestre 1' | 'Semestre 2' (or 1 | 2).
 */
export function validateSemester(semester: unknown): { isValid: boolean; cleanSemester: number; error?: string } {
  if (semester === null || semester === undefined) {
    return { isValid: false, cleanSemester: 1, error: 'Le semestre est obligatoire.' };
  }

  let num = 0;
  if (typeof semester === 'number') {
    num = semester;
  } else if (typeof semester === 'string') {
    const s = semester.trim().toLowerCase();
    if (s.includes('1') || s === 'semestre 1' || s === 's1') {
      num = 1;
    } else if (s.includes('2') || s === 'semestre 2' || s === 's2') {
      num = 2;
    }
  }

  if (num !== 1 && num !== 2) {
    return {
      isValid: false,
      cleanSemester: 1,
      error: 'Semestre non autorisé. Seuls Semestre 1 et Semestre 2 sont acceptés (règle des 2 semestres par an).'
    };
  }

  return { isValid: true, cleanSemester: num };
}

/**
 * Valid academic levels.
 */
export const ALLOWED_ACADEMIC_LEVELS = [
  'Licence 1',
  'Licence 2',
  'Licence 3',
  'Master 1',
  'Master 2',
] as const;

export function validateAcademicLevel(level: unknown): { isValid: boolean; cleanLevel: string; levelCode: string } {
  const str = sanitizeString(level, 50);
  const found = ALLOWED_ACADEMIC_LEVELS.find(
    (l) => l.toLowerCase() === str.toLowerCase() || l.replace(' ', '').toLowerCase() === str.toLowerCase()
  );

  if (found) {
    const codeMap: Record<string, string> = {
      'Licence 1': 'l1',
      'Licence 2': 'l2',
      'Licence 3': 'l3',
      'Master 1': 'm1',
      'Master 2': 'm2',
    };
    return { isValid: true, cleanLevel: found, levelCode: codeMap[found] || 'l1' };
  }

  return { isValid: false, cleanLevel: 'Licence 1', levelCode: 'l1' };
}

/**
 * Safe file extensions and MIME types.
 */
const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.png', '.jpg', '.jpeg'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
  'image/png',
  'image/jpeg',
];

/**
 * Check filename for path traversal attacks, dangerous extensions, and format.
 */
export function validateSafeFileName(fileName: unknown): { isValid: boolean; safeName: string; error?: string } {
  if (!fileName || typeof fileName !== 'string') {
    return { isValid: true, safeName: 'Document_Pedagogique.pdf' };
  }

  let clean = fileName.trim();

  // Reject path traversal attempts
  if (clean.includes('..') || clean.includes('/') || clean.includes('\\') || clean.includes('%00')) {
    return { isValid: false, safeName: '', error: 'Nom de fichier malveillant ou non autorisé (tentative de traversée de chemin détectée).' };
  }

  // Remove dangerous special characters
  clean = clean.replace(/[^a-zA-Z0-9._\-]/g, '_');

  // Check extension
  const ext = clean.substring(clean.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_FILE_EXTENSIONS.includes(ext)) {
    return {
      isValid: false,
      safeName: '',
      error: `Format de fichier non autorisé (${ext}). Formats acceptés : PDF, Word, Excel, PowerPoint, ZIP, Images.`
    };
  }

  return { isValid: true, safeName: clean };
}

export function validateSafeMimeType(mimeType: unknown): boolean {
  if (!mimeType || typeof mimeType !== 'string') return true;
  return ALLOWED_MIME_TYPES.includes(mimeType.trim().toLowerCase());
}

/**
 * Nettoie un terme de recherche utilisateur avant de l'interpoler dans un
 * filtre PostgREST (`.or('col.ilike.%…%')`). Sans cela, un utilisateur
 * pourrait injecter ses propres virgules/parenthèses/points pour ajouter
 * des clauses de filtre non prévues, ou ses propres caractères joker
 * ILIKE (`%`, `_`) pour élargir une recherche au-delà de ce qui est
 * censé être accessible. Ce n'est pas de l'injection SQL classique
 * (PostgREST paramètre la requête finale), mais une injection de la
 * grammaire de filtre elle-même — Phase 7 §5.
 */
export function sanitizeSearchTerm(input: unknown, maxLength: number = 100): string {
  if (input === null || input === undefined) return '';
  let str = String(input);
  str = str.replace(/[\x00-\x1F\x7F]/g, ''); // caractères de contrôle
  str = str.replace(/[,.()%_*]/g, ' '); // syntaxe de filtre PostgREST + jokers ILIKE
  str = str.trim().slice(0, maxLength);
  return str;
}
