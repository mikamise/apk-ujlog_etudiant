import { NextRequest } from 'next/server';
import { jsonError, jsonSuccess } from '@/lib/api-response';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { getSessionUser } from '@/lib/server-session';
import { createAdminClient } from '@/lib/supabase/server';

/** Les abonnements push restent côté serveur : aucune clé privée n'est envoyée au navigateur. */
export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, 'WRITE', { discriminator: 'push_subscribe' });
  if (limited) return limited;
  const session = await getSessionUser();
  if (!session) return jsonError('Non authentifié.', 401, undefined, req);
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
    return jsonError('Les notifications système ne sont pas encore configurées sur le serveur.', 503, undefined, req);
  }
  let body: { subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } } };
  try { body = await req.json(); } catch { return jsonError('Requête invalide.', 400, undefined, req); }
  const sub = body.subscription;
  if (!sub || typeof sub.endpoint !== 'string' || !sub.endpoint.startsWith('https://') ||
      typeof sub.keys?.p256dh !== 'string' || typeof sub.keys?.auth !== 'string' ||
      sub.endpoint.length > 2048 || sub.keys.p256dh.length > 256 || sub.keys.auth.length > 256) {
    return jsonError('Abonnement push invalide.', 400, undefined, req);
  }
  const admin = createAdminClient();
  const { error } = await admin.from('push_subscriptions').upsert({
    user_id: session.userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth,
    user_agent: req.headers.get('user-agent')?.slice(0, 500) ?? null, updated_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' });
  if (error) return jsonError('Impossible d’enregistrer cet appareil.', 500, undefined, req);
  return jsonSuccess({ subscribed: true }, undefined, 200, req);
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return jsonError('Non authentifié.', 401, undefined, req);
  let endpoint = '';
  try { endpoint = String((await req.json())?.endpoint ?? ''); } catch { return jsonError('Requête invalide.', 400, undefined, req); }
  if (!endpoint.startsWith('https://') || endpoint.length > 2048) return jsonError('Abonnement invalide.', 400, undefined, req);
  const admin = createAdminClient();
  const { error } = await admin.from('push_subscriptions').delete().eq('user_id', session.userId).eq('endpoint', endpoint);
  if (error) return jsonError('Impossible de retirer cet appareil.', 500, undefined, req);
  return jsonSuccess({ unsubscribed: true }, undefined, 200, req);
}
