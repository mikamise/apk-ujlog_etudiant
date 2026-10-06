import crypto from 'crypto';

/** SHA-256 hex — seul le hash d'un code d'activation est stocké en base. */
export function hashActivationCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}

/** Ex. DEL-L1-3F9A0C12B7E4 — 6 octets = 48 bits d'aléa (4 octets / 32 bits auparavant). */
export function generateReadableCode(levelCode: string): string {
  const prefix = `DEL-${(levelCode || 'L1').toUpperCase()}`;
  const randomChars = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `${prefix}-${randomChars}`;
}

/** Indice affichable à l'admin : jamais le code complet. */
export function codeHint(code: string): string {
  return `${code.slice(0, -4)}••••`;
}
