import { Resend } from 'resend';

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY non configurée : aucun e-mail ne peut être envoyé.');
  }
  return new Resend(apiKey);
}

/** Échappe les caractères HTML de tout texte saisi par un utilisateur avant insertion dans un e-mail. */
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Envoie via Resend et LÈVE une erreur en cas d'échec. Le SDK Resend ne
 * lève pas d'exception : il renvoie { data, error }. Sans cette
 * vérification, un envoi refusé (clé invalide, domaine non vérifié,
 * expéditeur onboarding@resend.dev vers une autre adresse que celle du
 * compte Resend...) était considéré comme réussi.
 */
async function send(payload: { to: string; subject: string; html: string }) {
  const resend = getResendClient();
  const { data, error } = await resend.emails.send({ from: FROM, ...payload });
  if (error) {
    throw new Error(`Resend: ${error.message || JSON.stringify(error)}`);
  }
  return data;
}

const FROM = process.env.RESEND_FROM_EMAIL || 'UJLOG Étudiant <onboarding@resend.dev>';

function wrapper(title: string, bodyHtml: string, ctaLabel?: string, ctaUrl?: string) {
  return `
  <div style="font-family: 'Manrope', Arial, sans-serif; background:#fff8f1; padding:32px 16px;">
    <div style="max-width:480px;margin:0 auto;background:#fffdf9;border-radius:24px;overflow:hidden;border:1px solid #fde4cc;">
      <div style="background:linear-gradient(135deg,#ea580c,#c2410c,#7c2d12);padding:28px 24px;">
        <p style="margin:0;color:#fff7ed;font-weight:800;font-size:13px;letter-spacing:0.06em;">UJLOG ÉTUDIANT</p>
        <p style="margin:6px 0 0;color:#fff7ed;font-size:10px;letter-spacing:0.04em;opacity:0.85;">Université Jean Lorougnon Guédé — Département de Géographie</p>
      </div>
      <div style="padding:28px 24px;">
        <h1 style="margin:0 0 12px;font-size:17px;color:#2b1608;">${esc(title)}</h1>
        <div style="font-size:13px;line-height:1.6;color:#92703f;">${bodyHtml}</div>
        ${
          ctaUrl
            ? `<div style="margin-top:24px;">
                <a href="${esc(ctaUrl)}" style="display:inline-block;background:linear-gradient(135deg,#ea580c,#c2410c);color:#fff7ed;text-decoration:none;font-weight:800;font-size:13px;padding:12px 24px;border-radius:14px;">${esc(ctaLabel)}</a>
              </div>`
            : ''
        }
      </div>
      <div style="padding:16px 24px;border-top:1px solid #fde4cc;">
        <p style="margin:0;font-size:10px;color:#92703f;opacity:0.7;">Si vous n'êtes pas à l'origine de cette action, ignorez simplement cet e-mail.</p>
      </div>
    </div>
  </div>`;
}

export async function sendVerificationEmail(to: string, confirmUrl: string) {
  return send({
    to,
    subject: 'Confirmez votre adresse e-mail — UJLOG Étudiant',
    html: wrapper(
      'Confirmez votre adresse e-mail',
      `<p>Merci de vous être inscrit sur le portail étudiant du Département de Géographie. Cliquez sur le bouton ci-dessous pour activer votre compte, puis connectez-vous avec votre e-mail et votre mot de passe.</p>`,
      'Confirmer mon adresse e-mail',
      confirmUrl
    ),
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  return send({
    to,
    subject: 'Réinitialisation de votre mot de passe — UJLOG Étudiant',
    html: wrapper(
      'Réinitialisation de mot de passe',
      `<p>Une demande de réinitialisation de mot de passe a été effectuée pour ce compte. Ce lien est valable 1 heure et à usage unique.</p>`,
      'Réinitialiser mon mot de passe',
      resetUrl
    ),
  });
}

export async function sendRoleInvitationEmail(
  to: string,
  role: 'delegate' | 'admin' | 'super_admin',
  activateUrl: string,
  expiresAt: Date
) {
  const roleLabel = { delegate: 'Délégué', admin: 'Administrateur', super_admin: 'Super Administrateur' }[role];
  return send({
    to,
    subject: `Invitation — Compte ${roleLabel} UJLOG Étudiant`,
    html: wrapper(
      `Vous êtes invité(e) en tant que ${roleLabel}`,
      `<p>Un administrateur vous a invité(e) à créer un compte ${roleLabel} sur le portail UJLOG Étudiant.</p>
       <p>Ce lien est <strong>personnel, à usage unique</strong> et expire le ${esc(expiresAt.toLocaleString('fr-FR'))}.</p>`,
      'Activer mon compte',
      activateUrl
    ),
  });
}

/**
 * Emails "académiques" (cours publié, annonce ciblée) — envoyés via la
 * file d'attente (voir lib/notification-dispatch.ts), jamais en boucle
 * synchrone. Chaque email individuel reste ciblé à un seul destinataire ;
 * c'est la file d'attente qui garantit qu'on n'envoie jamais à toute la
 * base d'un coup.
 */
export async function sendCoursePublishedEmail(
  to: string,
  data: { courseTitle: string; subjectName: string; levelLabel: string; courseUrl: string }
) {
  return send({
    to,
    subject: `Nouveau cours publié — ${String(data.subjectName ?? '').slice(0, 120)}`,
    html: wrapper(
      'Nouveau cours disponible',
      `<p>Un nouveau document vient d’être publié dans votre espace (${esc(data.levelLabel)}) :</p>
       <p style="font-weight:700;color:#2b1608;">${esc(data.courseTitle)}</p>
       <p>Matière : ${esc(data.subjectName)}</p>`,
      'Consulter le cours',
      data.courseUrl
    ),
  });
}

export async function sendAnnouncementEmail(to: string, data: { title: string; message: string }) {
  return send({
    to,
    subject: String(data.title ?? '').slice(0, 150),
    html: wrapper('Nouvelle annonce', `<p>${esc(data.message)}</p>`),
  });
}
