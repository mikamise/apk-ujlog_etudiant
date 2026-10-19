import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { createAdminClient } from '@/lib/supabase/server';
import { timingSafeEqualStrings } from '@/lib/security-crypto';
import { processEmailQueue } from '@/lib/email-queue';

/**
 * Vide la file d'attente des e-mails (cours publiés, annonces).
 *
 * Les e-mails partent normalement juste après la publication (voir
 * lib/notification-dispatch.ts). Cette route sert de filet de sécurité
 * pour les envois échoués : le cron Vercel déclaré dans vercel.json
 * l'appelle en GET avec "Authorization: Bearer <CRON_SECRET>" (en-tête
 * ajouté automatiquement par Vercel quand CRON_SECRET est défini).
 * Un appel manuel est possible en POST avec l'en-tête "x-cron-secret".
 */
function isAuthorizedCron(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const headerSecret = req.headers.get('x-cron-secret');
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const provided = headerSecret || bearer || '';
  return timingSafeEqualStrings(provided, expected);
}

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  const rateLimit = await enforceRateLimit(req, 'ADMIN');
  if (rateLimit) return rateLimit;

  if (!isAuthorizedCron(req)) {
    return jsonError('Accès refusé.', 403, undefined, req);
  }

  try {
    const result = await processEmailQueue(createAdminClient(), { maxBatches: 10 });
    return jsonSuccess(result, undefined, 200, req);
  } catch {
    return jsonError('Impossible de traiter la file d’attente.', 500, undefined, req);
  }
}
