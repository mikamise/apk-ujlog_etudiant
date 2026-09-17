import { NextRequest, NextResponse } from 'next/server';
import { enforcePayloadSize, enforceRateLimit, getClientIp } from '@/lib/rate-limiter';
import { sanitizeString } from '@/lib/security-validator';
import { logSecurityEvent } from '@/lib/security-logger';
import { getSessionUser } from '@/lib/server-session';
import { createAdminClient } from '@/lib/supabase/server';
import { hashActivationCode } from '@/lib/activation-codes';

/**
 * POST /api/delegate/activate-code — Activation d'un code délégué par un utilisateur connecté.
 * Protégé contre les race conditions et les attaques par force brute.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  const payloadCheck = enforcePayloadSize(req, 'AUTH');
  if (payloadCheck) return payloadCheck;

  // Limitation stricte des tentatives d'activation pour empêcher les attaques par dictionnaire/bruteforce
  const rateLimit = await enforceRateLimit(req, 'AUTH', {
    discriminator: 'activate_code',
    customMessage: 'Trop de tentatives d’activation. Veuillez patienter avant de réessayer.',
  });
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Vous devez être connecté pour activer un code délégué.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawCode = sanitizeString(body.code, 50).toUpperCase();

    if (!rawCode) {
      return NextResponse.json(
        { success: false, error: 'Veuillez saisir votre code d’activation délégué.' },
        { status: 400 }
      );
    }

    if (session.profile.role === 'admin' || session.profile.role === 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Un compte administrateur ne peut pas activer un code délégué.' },
        { status: 403 }
      );
    }

    const codeHash = hashActivationCode(rawCode);
    const admin = createAdminClient();

    // 1. Tenter l'activation via la procédure stockée RPC si disponible
    const { data: rpcResult, error: rpcError } = await admin.rpc('redeem_activation_code', {
      p_code: rawCode,
      p_user_id: session.userId,
    });

    if (!rpcError && rpcResult) {
      if (!rpcResult.success) {
        logSecurityEvent({
          eventType: 'ROLE_INVITATION_INVALID',
          severity: 'WARN',
          ip,
          userIdentifier: session.profile.email,
          details: { reason: rpcResult.error },
        });
        return NextResponse.json({ success: false, error: rpcResult.error }, { status: 400 });
      }

      logSecurityEvent({
        eventType: 'ROLE_INVITATION_ACCEPTED',
        severity: 'INFO',
        ip,
        userIdentifier: session.profile.email,
        details: { role: rpcResult.role },
      });

      return NextResponse.json({
        success: true,
        message: rpcResult.message || 'Statut délégué activé avec succès !',
        role: rpcResult.role,
        levelCode: rpcResult.levelCode,
        fieldCode: rpcResult.fieldCode,
        academicYearId: rpcResult.academicYearId,
      });
    }

    // 2. Repli transactionnel côté serveur si la fonction RPC n'a pas encore été migrée en base
    const nowIso = new Date().toISOString();

    // Verrouillage conditionnel atomique : une seule requête concurrente réussit l'update
    const { data: updatedCodes, error: updateError } = await admin
      .from('activation_codes')
      .update({
        status: 'active',
        used_by: session.userId,
        used_at: nowIso,
      })
      .eq('code_hash', codeHash)
      .eq('status', 'pending')
      .gt('expires_at', nowIso)
      .select('*');

    if (updateError || !updatedCodes || updatedCodes.length === 0) {
      // Vérifier la raison exacte pour un message d'erreur clair et constructif
      const { data: checkCode } = await admin
        .from('activation_codes')
        .select('status, expires_at')
        .eq('code_hash', codeHash)
        .maybeSingle();

      let reason = 'Code d’activation invalide ou inexistant.';
      if (checkCode) {
        if (checkCode.status === 'revoked') {
          reason = 'Ce code d’activation a été révoqué par l’administration.';
        } else if (checkCode.status === 'active') {
          reason = 'Ce code d’activation a déjà été utilisé.';
        } else if (checkCode.expires_at <= nowIso || checkCode.status === 'expired') {
          reason = 'Ce code d’activation a expiré.';
        }
      }

      logSecurityEvent({
        eventType: 'ROLE_INVITATION_INVALID',
        severity: 'WARN',
        ip,
        userIdentifier: session.profile.email,
        details: { reason },
      });

      return NextResponse.json({ success: false, error: reason }, { status: 400 });
    }

    const activeCode = updatedCodes[0];

    // Mettre à jour le rôle de l'utilisateur
    await admin
      .from('profiles')
      .update({ role: activeCode.role, updated_at: nowIso })
      .eq('id', session.userId);

    // Mettre à jour / créer le profil délégué
    if (activeCode.role === 'delegate') {
      await admin.from('delegate_profiles').upsert(
        {
          user_id: session.userId,
          level_code: activeCode.level_code,
          field_code: activeCode.field_code,
          academic_year_id: activeCode.academic_year_id,
          status: 'active',
          assigned_at: nowIso,
          revoked_at: null,
          revoked_by: null,
        },
        { onConflict: 'user_id, academic_year_id' }
      );
    }

    // Journalisation d'audit immuable
    await admin.from('audit_logs').insert({
      user_id: session.userId,
      user_email: session.profile.email,
      user_role: activeCode.role,
      action: 'ACTIVATION_CODE_REDEEMED',
      entity_type: 'activation_codes',
      entity_id: activeCode.id,
      target_summary: `Activation code ${activeCode.code_hint ?? '••••'} -> ${activeCode.role} (${activeCode.level_code})`,
      result: 'success',
      metadata: { role: activeCode.role },
    });

    logSecurityEvent({
      eventType: 'ROLE_INVITATION_ACCEPTED',
      severity: 'INFO',
      ip,
      userIdentifier: session.profile.email,
      details: { role: activeCode.role },
    });

    return NextResponse.json({
      success: true,
      message: 'Félicitations ! Votre statut délégué a été activé avec succès.',
      role: activeCode.role,
      levelCode: activeCode.level_code,
      fieldCode: activeCode.field_code,
      academicYearId: activeCode.academic_year_id,
    });
  } catch (error) {
    logSecurityEvent({
      eventType: 'SYSTEM_ERROR',
      severity: 'ERROR',
      ip,
      details: { route: '/api/delegate/activate-code', error: (error as Error).message },
    });
    return NextResponse.json({ success: false, error: 'Une erreur technique est survenue.' }, { status: 500 });
  }
}
