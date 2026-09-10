import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { enforcePayloadSize, enforceRateLimit, getClientIp } from '@/lib/rate-limiter';
import { validateEmail, sanitizeString } from '@/lib/security-validator';
import { logSecurityEvent } from '@/lib/security-logger';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendRoleInvitationEmail } from '@/lib/email';

const VALID_ROLES = ['delegate', 'admin', 'super_admin'] as const;
type InviteRole = (typeof VALID_ROLES)[number];

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * GET /api/admin/invitations — liste les invitations (email, rôle, statut,
 * date d'expiration). Le token en clair n'est JAMAIS renvoyé : il n'existe
 * qu'au moment de la création, dans l'e-mail envoyé au destinataire.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Non authentifié.' }, { status: 401 });
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('role_invitations')
    .select('id, email, role, level_code, field_code, status, expires_at, accepted_at, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ success: false, error: 'Erreur lors de la récupération des invitations.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, invitations: data });
}

/**
 * POST /api/admin/invitations — génère une invitation à usage unique.
 * Réservé aux Super Admins pour les rôles admin/super_admin ; un Admin
 * peut inviter un Délégué dans son périmètre.
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);

  const payloadCheck = enforcePayloadSize(req, 'AUTH');
  if (payloadCheck) return payloadCheck;

  const rateLimit = enforceRateLimit(req, 'AUTH', {
    discriminator: 'create_invitation',
    customMessage: 'Trop de demandes d’invitation. Veuillez patienter.',
  });
  if (rateLimit) return rateLimit;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Non authentifié.' }, { status: 401 });
  }

  const { data: inviterProfile } = await supabase.from('profiles').select('role, email').eq('id', user.id).single();
  if (!inviterProfile || !['admin', 'super_admin'].includes(inviterProfile.role)) {
    return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));

    const emailValidation = validateEmail(body.email);
    if (!emailValidation.isValid) {
      return NextResponse.json(
        { success: false, error: emailValidation.error || 'Adresse email invalide.' },
        { status: 400 }
      );
    }

    const role = sanitizeString(body.role, 20) as InviteRole;
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ success: false, error: 'Rôle invalide.' }, { status: 400 });
    }

    // Un Admin (non Super Admin) ne peut inviter que des délégués.
    if (inviterProfile.role === 'admin' && role !== 'delegate') {
      return NextResponse.json(
        { success: false, error: 'Seul un Super Admin peut inviter un compte Admin ou Super Admin.' },
        { status: 403 }
      );
    }

    const levelCode = role === 'delegate' ? sanitizeString(body.levelCode, 20) : null;
    const fieldCode = role === 'delegate' ? sanitizeString(body.fieldCode, 40) : null;
    if (role === 'delegate' && (!levelCode || !fieldCode)) {
      return NextResponse.json(
        { success: false, error: 'Le niveau et la filière sont obligatoires pour une invitation Délégué.' },
        { status: 400 }
      );
    }

    // Token cryptographiquement sûr (256 bits), jamais stocké en clair.
    const rawToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = hashToken(rawToken);

    const expiryHours = Number(process.env.ROLE_INVITATION_EXPIRY_HOURS || 24);
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    const admin = createAdminClient();
    const { error: insertError } = await admin.from('role_invitations').insert({
      email: emailValidation.cleanEmail,
      role,
      level_code: levelCode,
      field_code: fieldCode,
      token_hash: tokenHash,
      status: 'pending',
      invited_by: user.id,
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      return NextResponse.json({ success: false, error: 'Impossible de créer l’invitation.' }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const activateUrl = `${appUrl}/invitation/accepter?token=${rawToken}`;
    await sendRoleInvitationEmail(emailValidation.cleanEmail, role, activateUrl, expiresAt);

    await admin.from('audit_logs').insert({
      user_id: user.id,
      user_email: inviterProfile.email,
      user_role: inviterProfile.role,
      action: 'ROLE_INVITATION_CREATED',
      entity_type: 'role_invitations',
      target_summary: `${emailValidation.cleanEmail} → ${role}`,
      result: 'success',
      metadata: { role, level_code: levelCode, field_code: fieldCode },
    });

    logSecurityEvent({
      eventType: 'ROLE_INVITATION_CREATED',
      severity: 'INFO',
      ip,
      userIdentifier: inviterProfile.email,
      details: { targetEmail: emailValidation.cleanEmail, role },
    });

    return NextResponse.json({
      success: true,
      message: `Invitation envoyée à ${emailValidation.cleanEmail}.`,
    });
  } catch (error) {
    logSecurityEvent({
      eventType: 'SYSTEM_ERROR',
      severity: 'ERROR',
      ip,
      details: { route: '/api/admin/invitations', error: (error as Error).message },
    });
    return NextResponse.json({ success: false, error: 'Une erreur est survenue.' }, { status: 500 });
  }
}
