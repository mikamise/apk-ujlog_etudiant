import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { enforcePayloadSize, enforceRateLimit, getClientIp } from '@/lib/rate-limiter';
import { validatePassword, sanitizeString } from '@/lib/security-validator';
import { logSecurityEvent } from '@/lib/security-logger';
import { createClient, createAdminClient } from '@/lib/supabase/server';

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * POST /api/admin/invitations/accept — active une invitation Admin/Délégué.
 * Le token n'est comparé qu'à son empreinte ; une fois consommé, il devient
 * définitivement invalide (statut "accepted"), impossible à réutiliser.
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);

  const payloadCheck = enforcePayloadSize(req, 'AUTH');
  if (payloadCheck) return payloadCheck;

  const rateLimit = enforceRateLimit(req, 'AUTH', {
    discriminator: 'accept_invitation',
    customMessage: 'Trop de tentatives. Veuillez patienter.',
  });
  if (rateLimit) return rateLimit;

  try {
    const body = await req.json().catch(() => ({}));
    const token = sanitizeString(body.token, 200);
    const firstName = sanitizeString(body.firstName, 60);
    const lastName = sanitizeString(body.lastName, 60);

    if (!token) {
      return NextResponse.json({ success: false, error: 'Lien d’invitation invalide.' }, { status: 400 });
    }

    const passwordValidation = validatePassword(body.password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.error || 'Mot de passe invalide.' },
        { status: 400 }
      );
    }

    if (!firstName || !lastName) {
      return NextResponse.json({ success: false, error: 'Le nom et le prénom sont obligatoires.' }, { status: 400 });
    }

    const tokenHash = hashToken(token);
    const admin = createAdminClient();

    const { data: invitation } = await admin
      .from('role_invitations')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (!invitation) {
      logSecurityEvent({ eventType: 'ROLE_INVITATION_INVALID', severity: 'WARN', ip, details: {} });
      return NextResponse.json({ success: false, error: 'Invitation introuvable ou déjà utilisée.' }, { status: 404 });
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Cette invitation a déjà été utilisée, révoquée ou a expiré.' },
        { status: 410 }
      );
    }

    if (new Date(invitation.expires_at).getTime() < Date.now()) {
      await admin.from('role_invitations').update({ status: 'expired' }).eq('id', invitation.id);
      return NextResponse.json({ success: false, error: 'Cette invitation a expiré. Demandez-en une nouvelle.' }, { status: 410 });
    }

    // Création du compte réel via Supabase Auth.
    const supabase = await createClient();
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: invitation.email,
      password: body.password,
      options: { data: { first_name: firstName, last_name: lastName } },
    });

    if (signUpError || !signUpData.user) {
      return NextResponse.json(
        { success: false, error: 'Impossible de créer ce compte. Cette adresse est peut-être déjà utilisée.' },
        { status: 409 }
      );
    }

    const userId = signUpData.user.id;

    const { error: profileError } = await admin.from('profiles').insert({
      id: userId,
      email: invitation.email,
      first_name: firstName,
      last_name: lastName,
      role: invitation.role,
      status: 'active',
    });

    if (profileError) {
      return NextResponse.json(
        { success: false, error: 'Le compte a été créé mais le profil n’a pas pu être finalisé. Contactez le support.' },
        { status: 500 }
      );
    }

    if (invitation.role === 'delegate') {
      await admin.from('delegate_profiles').insert({
        user_id: userId,
        level_code: invitation.level_code,
        field_code: invitation.field_code,
        academic_year_id: invitation.academic_year_id || '2026-2027',
        status: 'active',
      });
    }

    // Consommation définitive du token — ne peut plus jamais être réutilisé.
    await admin
      .from('role_invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString(), accepted_by: userId })
      .eq('id', invitation.id);

    await admin.from('audit_logs').insert({
      user_id: userId,
      user_email: invitation.email,
      user_role: invitation.role,
      action: 'ROLE_INVITATION_ACCEPTED',
      entity_type: 'role_invitations',
      entity_id: invitation.id,
      result: 'success',
    });

    logSecurityEvent({
      eventType: 'ROLE_INVITATION_ACCEPTED',
      severity: 'INFO',
      ip,
      userIdentifier: invitation.email,
      details: { role: invitation.role },
    });

    return NextResponse.json({
      success: true,
      message: 'Compte activé. Vérifiez votre boîte e-mail pour confirmer votre adresse avant de vous connecter.',
      requiresEmailConfirmation: true,
    });
  } catch (error) {
    logSecurityEvent({
      eventType: 'SYSTEM_ERROR',
      severity: 'ERROR',
      ip,
      details: { route: '/api/admin/invitations/accept', error: (error as Error).message },
    });
    return NextResponse.json({ success: false, error: 'Une erreur est survenue.' }, { status: 500 });
  }
}
