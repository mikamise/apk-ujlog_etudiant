import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { createAdminClient } from '@/lib/supabase/server';
import { sendCoursePublishedEmail, sendAnnouncementEmail } from '@/lib/email';

const BATCH_SIZE = 50;

interface PendingEmailRow {
  id: string;
  recipient_email: string;
  template: string;
  template_data: unknown;
  attempts: number;
}

/**
 * À appeler périodiquement par un scheduler externe (cron Netlify/Vercel,
 * ou pg_cron Supabase via un appel HTTP) — PAS depuis le navigateur, et
 * jamais depuis le chemin de requête de publication d'un cours. Traite
 * un lot borné à la fois : le débit reste maîtrisé quel que soit le
 * nombre d'étudiants inscrits, au lieu d'un pic proportionnel à la taille
 * de la base à chaque publication.
 *
 * Protégé par un secret partagé (CRON_SECRET) — jamais exposé publiquement.
 */
export async function POST(req: NextRequest) {
  const rateLimit = enforceRateLimit(req, 'ADMIN');
  if (rateLimit) return rateLimit;

  const secret = req.headers.get('x-cron-secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return jsonError('Accès refusé.', 403, undefined, req);
  }

  const admin = createAdminClient();
  const { data: pending, error } = await admin
    .from('email_queue')
    .select('id, recipient_email, template, template_data, attempts')
    .eq('status', 'pending')
    .lt('attempts', 3)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (error) return jsonError('Impossible de lire la file d’attente.', 500, undefined, req);
  if (!pending || pending.length === 0) return jsonSuccess({ processed: 0, sent: 0, failed: 0 }, undefined, 200, req);

  const results = await Promise.allSettled(
    (pending as PendingEmailRow[]).map(async (row: PendingEmailRow) => {
      if (row.template === 'course_published') {
        const data = row.template_data as unknown as {
          courseTitle: string;
          subjectName: string;
          levelLabel: string;
          courseUrl: string;
        };
        await sendCoursePublishedEmail(row.recipient_email, data);
      } else if (row.template === 'notification_broadcast') {
        const data = row.template_data as unknown as { title: string; message: string };
        await sendAnnouncementEmail(row.recipient_email, data);
      } else {
        throw new Error(`Modèle d’email inconnu : ${row.template}`);
      }
      return row.id;
    })
  );

  let sent = 0;
  let failed = 0;

  await Promise.all(
    results.map(async (result, i) => {
      const row = (pending as PendingEmailRow[])[i];
      if (result.status === 'fulfilled') {
        sent++;
        await admin.from('email_queue').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', row.id);
      } else {
        failed++;
        const attempts = row.attempts + 1;
        await admin
          .from('email_queue')
          .update({
            status: attempts >= 3 ? 'failed' : 'pending',
            attempts,
            last_error: String(result.reason).slice(0, 500),
          })
          .eq('id', row.id);
      }
    })
  );

  return jsonSuccess({ processed: pending.length, sent, failed }, undefined, 200, req);
}
