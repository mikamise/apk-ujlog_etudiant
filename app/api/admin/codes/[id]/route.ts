import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { enforcePayloadSize, enforceRateLimit, getClientIp } from '@/lib/rate-limiter';
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
 * PATCH /api/admin/codes/[id] — Modifier le statut d'un code (révoquer / réactiver).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session || !roleAtLeast(session.profile.role, 'admin')) {
    return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const targetStatus = body.status;

  if (!['revoked', 'pending'].includes(targetStatus)) {
    return NextResponse.json({ success: false, error: 'Statut invalide.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: existingCode } = await admin.from('activation_codes').select('*').eq('id', id).maybeSingle();
  if (!existingCode) {
    return NextResponse.json({ success: false, error: 'Code introuvable.' }, { status: 404 });
  }

  if (existingCode.status === 'active') {
    return NextResponse.json(
      { success: false, error: 'Impossible de modifier un code qui a déjà été utilisé.' },
      { status: 400 }
    );
  }

  const { data, error } = await admin
    .from('activation_codes')
    .update({ status: targetStatus })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ success: false, error: 'Erreur lors de la mise à jour du code.' }, { status: 500 });
  }

  await admin.from('audit_logs').insert({
    user_id: session.userId,
    user_email: session.profile.email,
    user_role: session.profile.role,
    action: targetStatus === 'revoked' ? 'ACTIVATION_CODE_REVOKED' : 'ACTIVATION_CODE_REACTIVATED',
    entity_type: 'activation_codes',
    entity_id: id,
    target_summary: `Code ${existingCode.code} -> statut ${targetStatus}`,
    result: 'success',
  });

  return NextResponse.json({ success: true, message: `Statut mis à jour : ${targetStatus}`, data });
}

/**
 * DELETE /api/admin/codes/[id] — Supprimer un code non utilisé.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session || !roleAtLeast(session.profile.role, 'admin')) {
    return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: existingCode } = await admin.from('activation_codes').select('*').eq('id', id).maybeSingle();
  if (!existingCode) {
    return NextResponse.json({ success: false, error: 'Code introuvable.' }, { status: 404 });
  }

  if (existingCode.status === 'active') {
    return NextResponse.json(
      { success: false, error: 'Impossible de supprimer un code qui a déjà été utilisé pour un délégué.' },
      { status: 400 }
    );
  }

  const { error } = await admin.from('activation_codes').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ success: false, error: 'Erreur lors de la suppression.' }, { status: 500 });
  }

  await admin.from('audit_logs').insert({
    user_id: session.userId,
    user_email: session.profile.email,
    user_role: session.profile.role,
    action: 'ACTIVATION_CODE_DELETED',
    entity_type: 'activation_codes',
    entity_id: id,
    target_summary: `Suppression code ${existingCode.code}`,
    result: 'success',
  });

  return NextResponse.json({ success: true, message: 'Code supprimé avec succès.' });
}

/**
 * POST /api/admin/codes/[id] — Régénérer un code (invalide l'ancien et crée un nouveau code pour le même périmètre).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session || !roleAtLeast(session.profile.role, 'admin')) {
    return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: oldCode } = await admin.from('activation_codes').select('*').eq('id', id).maybeSingle();
  if (!oldCode) {
    return NextResponse.json({ success: false, error: 'Code introuvable.' }, { status: 404 });
  }

  // Marquer l'ancien comme révoqué
  await admin.from('activation_codes').update({ status: 'revoked' }).eq('id', id);

  // Créer un nouveau code pour le même périmètre
  const newCodeStr = generateReadableCode(oldCode.level_code);
  const newHash = hashToken(newCodeStr);
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(); // 72 heures

  const { data: newCode, error } = await admin
    .from('activation_codes')
    .insert({
      code: newCodeStr,
      code_hash: newHash,
      role: oldCode.role,
      level_code: oldCode.level_code,
      field_code: oldCode.field_code,
      academic_year_id: oldCode.academic_year_id,
      status: 'pending',
      expires_at: expiresAt,
      created_by: session.userId,
    })
    .select()
    .single();

  if (error || !newCode) {
    return NextResponse.json({ success: false, error: 'Erreur lors de la régénération du code.' }, { status: 500 });
  }

  await admin.from('audit_logs').insert({
    user_id: session.userId,
    user_email: session.profile.email,
    user_role: session.profile.role,
    action: 'ACTIVATION_CODE_REGENERATED',
    entity_type: 'activation_codes',
    entity_id: newCode.id,
    target_summary: `Ancien code ${oldCode.code} -> Nouveau code ${newCodeStr}`,
    result: 'success',
  });

  return NextResponse.json({
    success: true,
    message: 'Nouveau code généré avec succès.',
    code: newCodeStr,
    data: newCode,
  });
}
