import { NextRequest } from 'next/server';
import { jsonError, jsonSuccess } from '@/lib/api-response';
import { getSessionUser } from '@/lib/server-session';
export async function GET(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return jsonError('Non authentifié.', 401, undefined, req);
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) return jsonError('Les notifications système ne sont pas encore configurées sur le serveur.', 503, undefined, req);
  return jsonSuccess({ publicKey }, undefined, 200, req);
}
