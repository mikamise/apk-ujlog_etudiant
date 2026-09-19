/**
 * Cryptographic security utilities for UJLOG Platform.
 * Uses Web Crypto API for secure random values, timing-safe equality, and hashing.
 */

/**
 * Generate a cryptographically secure random token (hex-encoded).
 */
export function generateSecureToken(byteLength: number = 32): string {
  const buffer = new Uint8Array(byteLength);
  crypto.getRandomValues(buffer);
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Timing-safe string comparison to prevent timing attacks on secrets and passwords.
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  
  const aLen = a.length;
  const bLen = b.length;
  
  // Use bitwise OR to avoid short-circuiting timing leaks
  let mismatch = aLen === bLen ? 0 : 1;
  const maxLen = Math.max(aLen, bLen);
  
  for (let i = 0; i < maxLen; i++) {
    const charA = i < aLen ? a.charCodeAt(i) : 0;
    const charB = i < bLen ? b.charCodeAt(i) : 0;
    mismatch |= charA ^ charB;
  }
  
  return mismatch === 0;
}

/**
 * Compute SHA-256 hash of a string using Web Crypto API.
 */
export async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
