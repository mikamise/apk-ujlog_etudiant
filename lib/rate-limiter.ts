import { NextResponse } from 'next/server';
import { logSecurityEvent } from './security-logger';

/**
 * ==============================================================================
 * UJLOG ÉTUDIANTS  -  PHASE 6 : RATE LIMITING, ANTI-ABUS, QUOTAS & PROTECTION
 * ==============================================================================
 * Centralized, multi-dimensional rate-limiting and resource protection engine.
 * Protects against brute-force, spam, DDoS, automated scraping, resource exhaustion,
 * and malicious client loops.
 */

export type RateLimitCategory =
  | 'AUTH'
  | 'SEARCH'
  | 'READ'
  | 'WRITE'
  | 'UPLOAD'
  | 'DOWNLOAD'
  | 'ADMIN'
  | 'SUPER_ADMIN';

export interface RateLimitCategoryConfig {
  windowMs: number;       // Sliding window in ms
  maxRequests: number;    // Maximum requests allowed in window
  lockoutMs?: number;     // Lockout duration in ms if threshold breached repeatedly
  maxPayloadBytes?: number; // Maximum payload size in bytes
  dailyQuota?: number;    // Maximum operations per 24-hour period
}

/**
 * Centralized Rate Limits Configuration
 * All limits are easily tunable in one central location.
 */
export const RATE_LIMITS: Record<RateLimitCategory, RateLimitCategoryConfig> = {
  // Authentication: Strictest protection against credential brute-force and stuffing
  AUTH: {
    windowMs: 60 * 1000,          // 1 minute
    // Par IP : une université entière peut partager la même IP publique (NAT),
    // la limite doit donc tolérer plusieurs étudiants simultanés. La vraie
    // protection anti-brute-force est la limite PAR COMPTE (voir
    // ACCOUNT_AUTH_LIMIT), indépendante de l'IP.
    maxRequests: 20,              // 20 attempts / min per IP
    lockoutMs: 15 * 60 * 1000,    // 15 min temporary lockout on sustained abuse
    maxPayloadBytes: 64 * 1024,   // 64 KB max body
  },

  // Search queries: Prevent denial-of-service via complex text search and database full-scans
  SEARCH: {
    windowMs: 60 * 1000,          // 1 minute
    maxRequests: 30,              // 30 searches / min
    maxPayloadBytes: 16 * 1024,   // 16 KB
  },

  // General Read operations: Generous for smooth user experience, capped against scrapers
  READ: {
    windowMs: 60 * 1000,          // 1 minute
    maxRequests: 120,             // 120 reads / min
    maxPayloadBytes: 16 * 1024,   // 16 KB
  },

  // General Write / Mutation operations: Prevent spamming creations/updates
  WRITE: {
    windowMs: 60 * 1000,          // 1 minute
    maxRequests: 30,              // 30 mutations / min
    maxPayloadBytes: 512 * 1024,  // 512 KB
  },

  // Document & metadata uploads: Heavy payload protection
  UPLOAD: {
    windowMs: 60 * 1000,          // 1 minute
    maxRequests: 10,              // 10 uploads / min
    maxPayloadBytes: 5 * 1024 * 1024, // 5 MB max payload
    dailyQuota: 50,               // 50 uploads / day per delegate/admin
  },

  // Document downloads: High-volume resource protection
  DOWNLOAD: {
    windowMs: 60 * 1000,          // 1 minute
    maxRequests: 25,              // 25 downloads / min
    dailyQuota: 200,              // 200 downloads / day per student
  },

  // Delegate / Admin operations: Controlled management traffic
  ADMIN: {
    windowMs: 60 * 1000,          // 1 minute
    maxRequests: 50,              // 50 operations / min
    maxPayloadBytes: 1024 * 1024, // 1 MB
  },

  // Super Admin critical operations: High security, strict thresholds
  SUPER_ADMIN: {
    windowMs: 60 * 1000,          // 1 minute
    maxRequests: 20,              // 20 operations / min
    lockoutMs: 10 * 60 * 1000,    // 10 min lockout on repeated abuse
    maxPayloadBytes: 2 * 1024 * 1024, // 2 MB
  },
};

/** Limite stricte par compte ciblé (login, mot de passe oublié...), quelle que soit l'IP. */
export const ACCOUNT_AUTH_LIMIT = { maxRequests: 5 } as const;

interface RateLimitRecord {
  timestamps: number[];
  lockedUntil?: number;
}

interface QuotaRecord {
  count: number;
  resetAt: number; // Unix timestamp in ms
}

// In-memory sliding window store and quota store
const memoryStore = new Map<string, RateLimitRecord>();
const quotaStore = new Map<string, QuotaRecord>();

// Automatic garbage collection every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    
    // Clean sliding window records
    for (const [key, record] of memoryStore.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 60 * 60 * 1000);
      if (record.timestamps.length === 0 && (!record.lockedUntil || record.lockedUntil < now)) {
        memoryStore.delete(key);
      }
    }

    // Clean expired daily quotas
    for (const [key, q] of quotaStore.entries()) {
      if (q.resetAt < now) {
        quotaStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;       // Unix timestamp in seconds
  retryAfter?: number; // Seconds to wait
  category: RateLimitCategory;
  isLockedOut?: boolean;
}

export interface QuotaResult {
  success: boolean;
  limit: number;
  current: number;
  remaining: number;
  reset: number;       // Unix timestamp in seconds
  retryAfter?: number; // Seconds until quota reset
}

/**
 * Extracts client IP safely from request headers.
 */
export function getClientIp(req: Request): string {
  // En-têtes posés par la plateforme d'hébergement (non falsifiables par le
  // client) en priorité ; x-forwarded-for peut contenir des valeurs injectées.
  const platformIp =
    req.headers.get('x-nf-client-connection-ip') || // Netlify
    req.headers.get('x-vercel-forwarded-for') || // Vercel
    req.headers.get('cf-connecting-ip') || // Cloudflare
    req.headers.get('x-real-ip');
  if (platformIp) return platformIp.split(',')[0].trim();

  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return '127.0.0.1';
}

/**
 * Builds a multi-dimensional identification key:
 * Combines category + (User ID if authenticated OR Client IP) + optional Discriminator.
 * Avoids penalizing shared university IPs for logged-in students.
 */
export function buildRateLimitKey(
  category: RateLimitCategory,
  req: Request,
  userId?: string,
  discriminator?: string,
  global?: boolean
): string {
  const ip = getClientIp(req);
  // global : compteur commun à toutes les IP (ex. tentatives sur un même compte).
  const subjectKey = global ? 'global' : userId ? `usr_${userId}` : `ip_${ip}`;
  const disc = discriminator ? `:${discriminator}` : '';
  return `${category}:${subjectKey}${disc}`;
}

/**
 * Check rate limit against the sliding window algorithm.
 */
export function checkRateLimit(
  req: Request,
  category: RateLimitCategory,
  options?: {
    userId?: string;
    discriminator?: string;
    customMaxRequests?: number;
    customWindowMs?: number;
    global?: boolean;
  }
): RateLimitResult {
  const config = RATE_LIMITS[category];
  const windowMs = options?.customWindowMs ?? config.windowMs;
  const maxRequests = options?.customMaxRequests ?? config.maxRequests;
  const lockoutMs = config.lockoutMs;

  const key = buildRateLimitKey(category, req, options?.userId, options?.discriminator, options?.global);
  const now = Date.now();

  let record = memoryStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    memoryStore.set(key, record);
  }

  // Check if currently locked out
  if (record.lockedUntil && record.lockedUntil > now) {
    const retryAfter = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      reset: Math.ceil(record.lockedUntil / 1000),
      retryAfter: Math.max(1, retryAfter),
      category,
      isLockedOut: true,
    };
  }

  // Filter timestamps within current sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  const reset = Math.ceil((now + windowMs) / 1000);

  if (record.timestamps.length >= maxRequests) {
    // If repeat offender and category supports lockout, apply temporary lockout
    if (lockoutMs && record.timestamps.length >= maxRequests * 2) {
      record.lockedUntil = now + lockoutMs;
    }

    const oldestTimestamp = record.timestamps[0] || now;
    const retryAfter = Math.ceil((oldestTimestamp + windowMs - now) / 1000);

    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      reset,
      retryAfter: Math.max(1, retryAfter),
      category,
      isLockedOut: Boolean(record.lockedUntil && record.lockedUntil > now),
    };
  }

  // Record this valid request
  record.timestamps.push(now);

  return {
    success: true,
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - record.timestamps.length),
    reset,
    category,
  };
}

/**
 * Check daily resource quota (e.g. 200 downloads/day).
 */
export function checkDailyQuota(
  category: RateLimitCategory,
  req: Request,
  userId?: string,
  discriminator?: string
): QuotaResult {
  const config = RATE_LIMITS[category];
  const maxDaily = config.dailyQuota || 500;

  const key = `quota:${buildRateLimitKey(category, req, userId, discriminator)}`;
  const now = Date.now();

  let record = quotaStore.get(key);
  if (!record || record.resetAt <= now) {
    // Set reset to end of current UTC day
    const tomorrow = new Date();
    tomorrow.setUTCHours(24, 0, 0, 0);
    record = { count: 0, resetAt: tomorrow.getTime() };
    quotaStore.set(key, record);
  }

  const resetSeconds = Math.ceil(record.resetAt / 1000);

  if (record.count >= maxDaily) {
    const retryAfter = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return {
      success: false,
      limit: maxDaily,
      current: record.count,
      remaining: 0,
      reset: resetSeconds,
      retryAfter,
    };
  }

  record.count += 1;

  return {
    success: true,
    limit: maxDaily,
    current: record.count,
    remaining: Math.max(0, maxDaily - record.count),
    reset: resetSeconds,
  };
}

/**
 * Generate standard HTTP RateLimit & Security headers.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset),
    'X-RateLimit-Category': result.category,
  };

  if (result.retryAfter) {
    headers['Retry-After'] = String(result.retryAfter);
  }

  return headers;
}

/**
 * Generate standard 429 Too Many Requests response.
 */
export function rateLimitExceededResponse(result: RateLimitResult, customMessage?: string): NextResponse {
  const message =
    customMessage ||
    (result.isLockedOut
      ? 'Accès temporairement bloqué suite à un nombre excessif de tentatives. Veuillez patienter avant de réessayer.'
      : 'Trop de requêtes. Veuillez patienter un instant avant de réessayer.');

  const headers = getRateLimitHeaders(result);

  return NextResponse.json(
    {
      success: false,
      error: message,
      retryAfter: result.retryAfter,
    },
    {
      status: 429,
      headers: {
        ...headers,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}

/**
 * ==============================================================================
 * STOCKAGE PARTAGÉ (Supabase)
 * ==============================================================================
 * Les Map en mémoire ci-dessus ne protègent rien en serverless (Netlify /
 * Vercel) : chaque instance a sa propre mémoire et redémarre souvent, donc un
 * attaquant répartit simplement ses tentatives. Pour les catégories sensibles,
 * le compteur est stocké en base via la fonction atomique `rate_limit_hit`
 * (migration 0010). Si la migration n'est pas encore appliquée ou si la base
 * ne répond pas, on retombe sur le store mémoire (dégradé mais non bloquant).
 */
const PERSISTED_CATEGORIES = new Set<RateLimitCategory>(['AUTH', 'WRITE', 'UPLOAD', 'DOWNLOAD', 'SUPER_ADMIN']);
let persistentStoreUnavailableLogged = false;

async function hitPersistentCounter(
  key: string,
  windowSeconds: number,
  maxRequests: number,
  lockoutSeconds: number
): Promise<{ allowed: boolean; count: number; resetAt: number; lockedUntil: number | null } | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const { createAdminClient } = await import('@/lib/supabase/server');
    const { data, error } = await createAdminClient().rpc('rate_limit_hit', {
      p_key: key,
      p_window_seconds: windowSeconds,
      p_max: maxRequests,
      p_lockout_seconds: lockoutSeconds,
    });
    if (error || !data) {
      if (!persistentStoreUnavailableLogged) {
        persistentStoreUnavailableLogged = true;
        console.warn('[rate-limiter] Stockage partagé indisponible (migration 0010 appliquée ?) — repli mémoire.', error?.message);
      }
      return null;
    }
    const row = data as { allowed: boolean; count: number; reset_at: string; locked_until: string | null };
    return {
      allowed: row.allowed,
      count: row.count,
      resetAt: new Date(row.reset_at).getTime(),
      lockedUntil: row.locked_until ? new Date(row.locked_until).getTime() : null,
    };
  } catch {
    return null;
  }
}

async function checkRateLimitShared(
  req: Request,
  category: RateLimitCategory,
  options?: { userId?: string; discriminator?: string; customMaxRequests?: number; global?: boolean }
): Promise<RateLimitResult> {
  if (!PERSISTED_CATEGORIES.has(category)) return checkRateLimit(req, category, options);

  const config = RATE_LIMITS[category];
  const maxRequests = options?.customMaxRequests ?? config.maxRequests;
  const key = buildRateLimitKey(category, req, options?.userId, options?.discriminator, options?.global);
  const hit = await hitPersistentCounter(
    key,
    Math.ceil(config.windowMs / 1000),
    maxRequests,
    Math.ceil((config.lockoutMs ?? 0) / 1000)
  );
  if (!hit) return checkRateLimit(req, category, options);

  const now = Date.now();
  const blockedUntil = hit.lockedUntil && hit.lockedUntil > now ? hit.lockedUntil : hit.resetAt;
  return {
    success: hit.allowed,
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - hit.count),
    reset: Math.ceil(blockedUntil / 1000),
    retryAfter: hit.allowed ? undefined : Math.max(1, Math.ceil((blockedUntil - now) / 1000)),
    category,
    isLockedOut: Boolean(hit.lockedUntil && hit.lockedUntil > now),
  };
}

async function checkDailyQuotaShared(
  category: RateLimitCategory,
  req: Request,
  userId?: string,
  discriminator?: string
): Promise<QuotaResult> {
  const config = RATE_LIMITS[category];
  const maxDaily = config.dailyQuota || 500;
  const key = `quota:${buildRateLimitKey(category, req, userId, discriminator)}`;
  const hit = await hitPersistentCounter(key, 24 * 60 * 60, maxDaily, 0);
  if (!hit) return checkDailyQuota(category, req, userId, discriminator);

  const now = Date.now();
  return {
    success: hit.allowed,
    limit: maxDaily,
    current: hit.count,
    remaining: Math.max(0, maxDaily - hit.count),
    reset: Math.ceil(hit.resetAt / 1000),
    retryAfter: hit.allowed ? undefined : Math.max(1, Math.ceil((hit.resetAt - now) / 1000)),
  };
}

/**
 * Enforce rate limit directly in an API Route handler.
 * Returns null if allowed, or standard 429 NextResponse if rate limit breached.
 */
export async function enforceRateLimit(
  req: Request,
  category: RateLimitCategory,
  options?: {
    userId?: string;
    discriminator?: string;
    customMessage?: string;
    /** Surcharge du nombre maximal de requêtes de la catégorie. */
    customMaxRequests?: number;
    /** Compteur commun à toutes les IP (limite par compte ciblé). */
    global?: boolean;
  }
): Promise<NextResponse | null> {
  const result = await checkRateLimitShared(req, category, options);

  if (!result.success) {
    logSecurityEvent({
      eventType: 'RATE_LIMIT_EXCEEDED',
      severity: result.isLockedOut ? 'WARN' : 'INFO',
      ip: getClientIp(req),
      userIdentifier: options?.userId,
      resource: `${req.method} ${new URL(req.url).pathname}`,
      details: {
        category,
        limit: result.limit,
        retryAfter: result.retryAfter,
        isLockedOut: result.isLockedOut,
      },
    });

    return rateLimitExceededResponse(result, options?.customMessage);
  }

  return null;
}

/**
 * Enforce daily resource quota in an API Route handler.
 */
export async function enforceDailyQuota(
  req: Request,
  category: RateLimitCategory,
  options?: {
    userId?: string;
    discriminator?: string;
    customMessage?: string;
  }
): Promise<NextResponse | null> {
  const quota = await checkDailyQuotaShared(category, req, options?.userId, options?.discriminator);

  if (!quota.success) {
    logSecurityEvent({
      eventType: 'QUOTA_EXCEEDED',
      severity: 'WARN',
      ip: getClientIp(req),
      userIdentifier: options?.userId,
      resource: `${req.method} ${new URL(req.url).pathname}`,
      details: {
        category,
        limit: quota.limit,
        current: quota.current,
        retryAfter: quota.retryAfter,
      },
    });

    return NextResponse.json(
      {
        success: false,
        error:
          options?.customMessage ||
          `Quota journalier dépassé (${quota.limit} opérations max / jour). Réessayez demain.`,
        retryAfter: quota.retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(quota.retryAfter),
          'X-RateLimit-Limit': String(quota.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(quota.reset),
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }

  return null;
}

/**
 * Enforces maximum request payload size.
 * Returns 413 Payload Too Large if Content-Length exceeds allowable limit.
 */
export function enforcePayloadSize(req: Request, category: RateLimitCategory): NextResponse | null {
  const maxBytes = RATE_LIMITS[category].maxPayloadBytes;
  if (!maxBytes) return null;

  const contentLength = req.headers.get('content-length');
  if (contentLength) {
    const bytes = parseInt(contentLength, 10);
    if (Number.isFinite(bytes) && bytes > maxBytes) {
      logSecurityEvent({
        eventType: 'PAYLOAD_TOO_LARGE',
        severity: 'WARN',
        ip: getClientIp(req),
        resource: `${req.method} ${new URL(req.url).pathname}`,
        details: { category, bytes, maxAllowed: maxBytes },
      });

      return NextResponse.json(
        {
          success: false,
          error: `Taille de requête excessive (${Math.round(bytes / 1024)} Ko). Limite autorisée : ${Math.round(
            maxBytes / 1024
          )} Ko.`,
        },
        {
          status: 413,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }
  }

  return null;
}
