import { NextRequest } from 'next/server';

/**
 * Extracts or generates a unique Request ID for request correlation across logs.
 */
export function getOrCreateRequestId(req: NextRequest): string {
  const existing = req.headers.get('x-request-id') || req.headers.get('x-correlation-id');
  if (existing) {
    return existing;
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Sensitive field patterns to sanitize in log records.
 */
const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'token',
  'sessiontoken',
  'secret',
  'cookie',
  'authorization',
  'database_url',
  'gemini_api_key',
];

/**
 * Recursively redacts sensitive keys from log metadata.
 */
export function sanitizeLogMetadata<T>(data: T): T {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogMetadata(item)) as unknown as T;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogMetadata(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}
