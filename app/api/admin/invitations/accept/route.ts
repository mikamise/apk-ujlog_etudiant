import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { enforcePayloadSize, enforceRateLimit, getClientIp } from '@/lib/rate-limiter';
import { validatePassword, sanitizeString } from '@/lib/security-validator';
import { logSecurityEvent } from '@/lib/security-logger';
import { createAdminClient } from '@/lib/supabase/server';
import { CURRENT_ACADEMIC_YEAR_ID, ensureAcademicYear, roleAtLeast, type SessionProfile } from '@/lib/server-session';

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

  const rateLimit = await enforceRateLimit(req, 'AUTH', {
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
    const nowIso = new Date().toISOString();

    // 1. Verrouillage atomique : une seule requête concurrente peut mettre à jour le statut
    const { data: updatedInvitations, error: updateError } = await admin
      .from('role_invitations')
      .update({
        status: 'accepted',
        accepted_at: nowIso,
      })
      .eq('token_hash', tokenHash)
      .eq('status', 'pending')
      .gt('expires_at', nowIso)
      .select('*');

    if (updateError || !updatedInvitations || updatedInvitations.length === 0) {
      logSecurityEvent({ eventType: 'ROLE_INVITATION_INVALID', severity: 'WARN', ip, details: { tokenHash: tokenHash.slice(0, 8) } });
      return NextResponse.json(
        { success: false, error: 'Cette invitation est invalide, a déjà été activée ou a expiré.' },
        { status: 410 }
      );
    }

    const invitation = updatedInvitations[0];

    // 2. Compte Supabase Auth : création, ou rattachement à un compte existant.
    //    SÉCURITÉ : on ne modifie JAMAIS le mot de passe d'un compte existant
    //    (avant : le mot de passe saisi ici remplaçait silencieusement celui du
    //    compte). La personne se connecte avec son mot de passe habituel.
    let userId: string;
    let accountAlreadyExisted = false;
    const { data: userData, error: createError } = await admin.auth.admin.createUser({
      email: invitation.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    });

    if (!createError && userData?.user) {
      userId = userData.user.id;
    } else {
      // generateLink('magiclink') ne crée rien : sert à retrouver le compte existant.
      const { data: probe } = await admin.auth.admin.generateLink({ type: 'magiclink', email: invitation.email });
      if (!probe?.user) {
        await admin.from('role_invitations').update({ status: 'pending', accepted_at: null }).eq('id', invitation.id);
        return NextResponse.json(
          { success: false, error: 'Impossible de finaliser ce compte. Veuillez contacter un administrateur.' },
          { status: 409 }
        );
      }
      userId = probe.user.id;
      accountAlreadyExisted = true;
      // Le lien d'invitation a été reçu sur cette adresse : elle est donc vérifiée.
      if (!probe.user.email_confirmed_at) {
        await admin.auth.admin.updateUserById(userId, { email_confirm: true });
      }
    }

    // 3. Profil applicatif — sans jamais rétrograder un rôle supérieur existant.
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('role, first_name, last_name')
      .eq('id', userId)
      .maybeSingle();
    const currentRole = (existingProfile?.role ?? 'student') as SessionProfile['role'];
    const finalRole = roleAtLeast(currentRole, invitation.role) ? currentRole : invitation.role;

    await admin.from('profiles').upsert({
      id: userId,
      email: invitation.email,
      first_name: existingProfile?.first_name || firstName,
      last_name: existingProfile?.last_name || lastName,
      role: finalRole,
      status: 'active',
      updated_at: nowIso,
    });

    // 4. Si rôle délégué, création ou activation du profil délégué
    if (invitation.role === 'delegate' && invitation.level_code && invitation.field_code) {
      const academicYearId = invitation.academic_year_id || CURRENT_ACADEMIC_YEAR_ID;
      await ensureAcademicYear(admin, academicYearId);
      await admin.from('delegate_profiles').upsert(
        {
          user_id: userId,
          level_code: invitation.level_code,
          field_code: invitation.field_code,
          academic_year_id: academicYearId,
          status: 'active',
          assigned_at: nowIso,
          revoked_at: null,
          revoked_by: null,
        },
        { onConflict: 'user_id, academic_year_id' }
      );
    }

    // 5. Association de accepted_by sur l'invitation
    await admin.from('role_invitations').update({ accepted_by: userId }).eq('id', invitation.id);

    // 6. Audit log immuable
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
      message: accountAlreadyExisted
        ? 'Invitation acceptée. Connectez-vous avec le mot de passe habituel de ce compte (ou utilisez « Mot de passe oublié »).'
        : 'Compte activé avec succès. Vous pouvez désormais vous connecter.',
      role: finalRole,
      accountAlreadyExisted,
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
