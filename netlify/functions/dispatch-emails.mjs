/**
 * Fonction planifiée Netlify : vide la file d'attente des e-mails
 * (cours publiés, annonces) toutes les 5 minutes en appelant la route
 * protégée /api/cron/dispatch-emails.
 *
 * Variables d'environnement requises sur Netlify :
 * - CRON_SECRET (même valeur que celle lue par la route)
 * - URL est fournie automatiquement par Netlify (URL principale du site)
 */
export default async function dispatchEmails() {
  const baseUrl = process.env.URL || process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.CRON_SECRET;

  if (!baseUrl || !secret) {
    console.error('[dispatch-emails] URL ou CRON_SECRET manquant : envoi ignoré.');
    return new Response('missing configuration', { status: 500 });
  }

  const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/cron/dispatch-emails`, {
    method: 'POST',
    headers: { 'x-cron-secret': secret },
  });
  const body = await res.text();
  console.log(`[dispatch-emails] ${res.status} ${body.slice(0, 300)}`);
  return new Response(body, { status: res.status });
}

export const config = {
  schedule: '*/5 * * * *',
};
