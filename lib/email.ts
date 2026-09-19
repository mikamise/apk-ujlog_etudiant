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
  const rawBase =
    process.env.NEXT_PUBLIC_APP_URL || process.env.URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || '';
  const base = rawBase.replace(/\/+$/, '');
  const logoSrc = base && !/votre-|your-|example\.(com|org)|localhost/i.test(base)
    ? `${base.startsWith('http') ? base : `https://${base}`}/logo-geographie.jpg`
    : null;

  return `
  <div style="font-family: 'Manrope', Arial, sans-serif; background:#ffffff; padding:32px 16px;">
    <div style="max-width:420px;margin:0 auto;background:#ffffff;border-radius:22px;border:1px solid #ede2d3;padding:30px 26px;text-align:center;box-shadow:0 6px 24px rgba(43,22,8,0.06);">
      ${
        logoSrc
          ? `<div style="width:52px;height:52px;border-radius:14px;background:#ffffff;margin:0 auto 14px;padding:6px;border:1px solid #ede2d3;box-shadow:0 6px 14px rgba(43,22,8,0.12);">
              <img src="${esc(logoSrc)}" width="40" height="40" alt="Logo Département de Géographie" style="display:block;width:40px;height:40px;object-fit:contain;border-radius:7px;margin:0 auto;" />
            </div>`
          : ''
      }
      <span style="display:inline-block;background:#fff1e0;color:#c2410c;font-weight:800;font-size:10.5px;padding:5px 11px;border-radius:9px;margin-bottom:12px;">UJLOG ÉTUDIANT</span>
      <h1 style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:18px;color:#2b1608;">${esc(title)}</h1>
      <div style="font-size:13px;line-height:1.6;color:#92703f;text-align:left;margin-top:14px;">${bodyHtml}</div>
      ${
        ctaUrl
          ? `<div style="margin-top:22px;">
              <a href="${esc(ctaUrl)}" style="display:inline-block;background:#e06600;color:#fff7ed;text-decoration:none;font-weight:800;font-size:13px;padding:12px 26px;border-radius:14px;">${esc(ctaLabel)}</a>
            </div>`
          : ''
      }
      <p style="margin:20px 0 0;padding-top:16px;border-top:1px solid #ede2d3;font-size:10px;color:#92703f;opacity:0.75;">Si vous n'êtes pas à l'origine de cette action, ignorez simplement cet e-mail.</p>
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
 * file d'attente `email_queue` (voir lib/email-queue.ts), par lots, jamais
 * en boucle synchrone. Chaque email reste adressé à un seul destinataire.
 */
export type RenderedEmail = { to: string; subject: string; html: string };

export function renderCoursePublishedEmail(
  to: string,
  data: { courseTitle: string; subjectName: string; levelLabel: string; courseUrl: string }
): RenderedEmail {
  return {
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
  };
}

export function renderAnnouncementEmail(to: string, data: { title: string; message: string }): RenderedEmail {
  return {
    to,
    subject: String(data.title ?? '').slice(0, 150),
    html: wrapper('Nouvelle annonce', `<p>${esc(data.message)}</p>`),
  };
}

/** Taille maximale d'un envoi groupé Resend. */
export const RESEND_BATCH_MAX = 100;

/**
 * Envoi groupé (API batch Resend) : jusqu'à 100 e-mails en UNE requête.
 * Le plan gratuit Resend limite l'API à 2 requêtes/seconde : envoyer les
 * e-mails un par un en parallèle en faisait rejeter la majorité.
 * Lève une erreur si Resend refuse le lot.
 */
export async function sendEmailBatch(emails: RenderedEmail[]): Promise<void> {
  if (emails.length === 0) return;
  if (emails.length > RESEND_BATCH_MAX) {
    throw new Error(`Lot trop grand (${emails.length} > ${RESEND_BATCH_MAX}).`);
  }
  const resend = getResendClient();
  const { error } = await resend.batch.send(emails.map((e) => ({ from: FROM, ...e })));
  if (error) {
    throw new Error(`Resend: ${error.message || JSON.stringify(error)}`);
  }
}
