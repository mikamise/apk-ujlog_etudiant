import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { enforcePayloadSize, enforceRateLimit, getClientIp } from '@/lib/rate-limiter';
import { sanitizeString } from '@/lib/security-validator';
import { logSecurityEvent } from '@/lib/security-logger';
import { getSessionUser, roleAtLeast } from '@/lib/server-session';
import { createAdminClient } from '@/lib/supabase/server';

function hashToken(val: string): string {
  return crypto.createHash('sha256').update(val).digest('hex');
}

function generateReadableCode(levelCode: string): string {
  const prefix = `DEL-${(levelCode || 'L1').toUpperCase()}`;
  const randomChars = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${randomChars}`;
}

/**
 * GET /api/admin/codes — Liste tous les codes d'activation générés.
 */
export async function GET(req: NextRequest) {
  const rateLimit = enforceRateLimit(req, 'ADMIN');
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session || !roleAtLeast(session.profile.role, 'admin')) {
    return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('activation_codes')
    .select(
      `id, code, role, level_code, field_code, academic_year_id, status, expires_at, used_at, created_at,
       creator:profiles!created_by(email, first_name, last_name),
       consumer:profiles!used_by(email, first_name, last_name)`
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ success: false, error: 'Impossible de récupérer les codes.' }, { status: 500 });
  }

  // Marquer automatiquement comme expirés les codes 'pending' dont la date est passée
  const now = new Date().toISOString();
  const codesWithUpdatedStatus = (data || []).map((c: any) => {
    if (c.status === 'pending' && c.expires_at < now) {
      return { ...c, status: 'expired' };
    }
    return c;
  });

  return NextResponse.json({ success: true, codes: codesWithUpdatedStatus });
}

/**
 * POST /api/admin/codes — Génère un nouveau code d'activation pour un délégué.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  const payloadCheck = enforcePayloadSize(req, 'AUTH');
  if (payloadCheck) return payloadCheck;

  const rateLimit = enforceRateLimit(req, 'ADMIN', {
    discriminator: 'create_activation_code',
  });
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session || !roleAtLeast(session.profile.role, 'admin')) {
    return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const levelCode = sanitizeString(body.levelCode, 20).toLowerCase();
    const fieldCode = sanitizeString(body.fieldCode, 50).toLowerCase();
    const academicYearId = sanitizeString(body.academicYearId || '2026-2027', 20);
    const expiryHours = Math.max(1, Math.min(168, Number(body.expiryHours) || 72));

    if (!levelCode || !fieldCode) {
      return NextResponse.json(
        { success: false, error: 'Le niveau et la filière sont obligatoires pour générer un code.' },
        { status: 400 }
      );
    }

    const code = generateReadableCode(levelCode);
    const codeHash = hashToken(code);
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('activation_codes')
      .insert({
        code,
        code_hash: codeHash,
        role: 'delegate',
        level_code: levelCode,
        field_code: fieldCode,
        academic_year_id: academicYearId,
        status: 'pending',
        expires_at: expiresAt,
        created_by: session.userId,
      })
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: error?.message || 'Erreur lors de la création du code.' },
        { status: 500 }
      );
    }

    await admin.from('audit_logs').insert({
      user_id: session.userId,
      user_email: session.profile.email,
      user_role: session.profile.role,
      action: 'ACTIVATION_CODE_CREATED',
      entity_type: 'activation_codes',
      entity_id: data.id,
      target_summary: `Code ${code} (${levelCode} / ${fieldCode})`,
      result: 'success',
      metadata: { code, level_code: levelCode, field_code: fieldCode, expires_at: expiresAt },
    });

    logSecurityEvent({
      eventType: 'ACTIVATION_CODE_CREATED',
      severity: 'INFO',
      ip,
      userIdentifier: session.profile.email,
      details: { code, levelCode, fieldCode },
    });

    return NextResponse.json({
      success: true,
      message: `Code d'activation généré avec succès.`,
      code,
      data,
    });
  } catch (error) {
    logSecurityEvent({
      eventType: 'SYSTEM_ERROR',
      severity: 'ERROR',
      ip,
      details: { route: '/api/admin/codes', error: (error as Error).message },
    });
    return NextResponse.json({ success: false, error: 'Une erreur est survenue.' }, { status: 500 });
  }
}
