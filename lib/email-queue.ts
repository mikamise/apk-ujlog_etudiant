import type { createAdminClient } from '@/lib/supabase/server';
import {
  RESEND_BATCH_MAX,
  renderAnnouncementEmail,
  renderCoursePublishedEmail,
  sendEmailBatch,
  type RenderedEmail,
} from '@/lib/email';

type AdminClient = ReturnType<typeof createAdminClient>;

const MAX_ATTEMPTS = 3;

interface QueueRow {
  id: string;
  recipient_email: string;
  template: string;
  template_data: unknown;
  attempts: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function render(row: QueueRow): RenderedEmail | null {
  if (row.template === 'course_published') {
    return renderCoursePublishedEmail(
      row.recipient_email,
      row.template_data as { courseTitle: string; subjectName: string; levelLabel: string; courseUrl: string }
    );
  }
  if (row.template === 'notification_broadcast') {
    return renderAnnouncementEmail(row.recipient_email, row.template_data as { title: string; message: string });
  }
  return null;
}

/**
 * Réserve une ligne de façon atomique en incrémentant `attempts` seulement
 * si personne ne l'a fait entre-temps : deux traitements simultanés (cron +
 * envoi après publication) ne peuvent jamais envoyer le même e-mail.
 */
async function claim(admin: AdminClient, row: QueueRow): Promise<boolean> {
  const { data } = await admin
    .from('email_queue')
    .update({ attempts: row.attempts + 1 })
    .eq('id', row.id)
    .eq('status', 'pending')
    .eq('attempts', row.attempts)
    .select('id');
  return Boolean(data && data.length > 0);
}

/**
 * Vide la file d'attente des e-mails par lots de 100 (API batch Resend),
 * en respectant la limite de 2 requêtes/seconde du plan gratuit Resend.
 * Borné en nombre de lots pour rester sous la durée maximale d'une
 * fonction Vercel ; le reste est repris au prochain passage.
 */
export async function processEmailQueue(
  admin: AdminClient,
  options: { maxBatches?: number } = {}
): Promise<{ processed: number; sent: number; failed: number }> {
  const maxBatches = options.maxBatches ?? 5;
  let processed = 0;
  let sent = 0;
  let failed = 0;

  for (let batch = 0; batch < maxBatches; batch++) {
    const { data: pending, error } = await admin
      .from('email_queue')
      .select('id, recipient_email, template, template_data, attempts')
      .eq('status', 'pending')
      .lt('attempts', MAX_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(RESEND_BATCH_MAX);

    if (error) throw new Error(`Lecture de la file impossible : ${error.message}`);
    if (!pending || pending.length === 0) break;

    const rows = pending as QueueRow[];
    const claimed = (await Promise.all(rows.map(async (row) => ((await claim(admin, row)) ? row : null)))).filter(
      (row): row is QueueRow => row !== null
    );
    if (claimed.length === 0) break;

    const unknownTemplate = claimed.filter((row) => !render(row));
    if (unknownTemplate.length > 0) {
      failed += unknownTemplate.length;
      await admin
        .from('email_queue')
        .update({ status: 'failed', last_error: 'Modèle d’e-mail inconnu.' })
        .in('id', unknownTemplate.map((row) => row.id));
    }

    const sendable = claimed.filter((row) => render(row));
    processed += claimed.length;

    if (sendable.length > 0) {
      try {
        await sendEmailBatch(sendable.map((row) => render(row)!));
        sent += sendable.length;
        await admin
          .from('email_queue')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .in('id', sendable.map((row) => row.id));
      } catch (err) {
        const lastError = String(err instanceof Error ? err.message : err).slice(0, 500);
        failed += sendable.length;
        const exhausted = sendable.filter((row) => row.attempts + 1 >= MAX_ATTEMPTS).map((row) => row.id);
        const retryable = sendable.filter((row) => row.attempts + 1 < MAX_ATTEMPTS).map((row) => row.id);
        if (exhausted.length > 0) {
          await admin.from('email_queue').update({ status: 'failed', last_error: lastError }).in('id', exhausted);
        }
        if (retryable.length > 0) {
          await admin.from('email_queue').update({ last_error: lastError }).in('id', retryable);
        }
        // Resend refuse le lot (clé, domaine, quota) : inutile d'enchaîner les lots suivants.
        break;
      }
    }

    if (pending.length < RESEND_BATCH_MAX) break;
    await sleep(600);
  }

  return { processed, sent, failed };
}
