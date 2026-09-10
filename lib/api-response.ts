import { NextResponse } from 'next/server';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiResponsePayload<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: PaginationMeta | Record<string, unknown>;
  requestId?: string;
}

/**
 * Extracts or generates a standard Request Correlation ID
 */
export function getRequestId(req?: Request): string {
  if (req) {
    const existing = req.headers.get('x-request-id') || req.headers.get('x-correlation-id');
    if (existing && existing.length < 100) return existing;
  }
  return crypto.randomUUID();
}

/**
 * Parses and bounds pagination parameters safely
 * Default limit: 20, Max limit: 100
 */
export function parsePaginationParams(searchParams: URLSearchParams, defaultLimit = 20, maxLimit = 100) {
  const pageRaw = parseInt(searchParams.get('page') || '1', 10);
  const limitRaw = parseInt(searchParams.get('limit') || String(defaultLimit), 10);

  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  let limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Builds standard pagination metadata
 */
export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Returns a standardized JSON success response
 */
export function jsonSuccess<T>(data: T, meta?: PaginationMeta | Record<string, unknown>, status = 200, req?: Request) {
  const requestId = getRequestId(req);
  const payload: ApiResponsePayload<T> = {
    success: true,
    data,
    meta,
    requestId,
  };

  return NextResponse.json(payload, {
    status,
    headers: {
      'x-request-id': requestId,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

/**
 * Returns a standardized JSON error response without exposing internal errors or stacks
 */
export function jsonError(message: string, status = 400, details?: unknown, req?: Request) {
  const requestId = getRequestId(req);
  const payload: ApiResponsePayload = {
    success: false,
    error: message,
    requestId,
  };

  if (process.env.NODE_ENV === 'development' && details) {
    payload.meta = { details };
  }

  return NextResponse.json(payload, {
    status,
    headers: {
      'x-request-id': requestId,
    },
  });
}
