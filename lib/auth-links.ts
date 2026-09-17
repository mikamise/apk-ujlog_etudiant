import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseUrl } from '@/lib/supabase/config';

/**
 * Liens d'authentification envoyés par e-mail (confirmation / réinitialisation).
 *
 * POURQUOI NE PAS UTILISER `properties.action_link` DE SUPABASE :
 * ce lien passe par le serveur Supabase, qui redirige ensuite vers
 * `redirectTo` avec les jetons dans le fragment `#access_token=...`.
 * Ça ne marche que si l'URL de l'app est dans la liste "Redirect URLs"
 * du projet Supabase (sinon redirection vers la "Site URL", souvent
 * localhost), et ça ouvre une session dans le navigateur sans passer par
 * la page de connexion. On construit donc nous-mêmes un lien direct vers
 * l'application avec `token_hash`, vérifié côté serveur via verifyOtp.
 */

export type EmailLinkType = 'signup' | 'recovery' | 'magiclink' | 'email';

/** Valeurs d'exemple copiées depuis .env.example, à ne jamais utiliser dans un lien. */
const PLACEHOLDER_URL_PATTERN = /votre-|your-|example\.(com|org)|localhost:0/i;

function usableUrl(value: string | undefined): string | null {
  const trimmed = value?.trim().replace(/\/+$/, '');
  if (!trimmed || PLACEHOLDER_URL_PATTERN.test(trimmed)) return null;
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * URL publique de l'app utilisée dans les liens envoyés par e-mail.
 * Ordre : NEXT_PUBLIC_APP_URL (si ce n'est pas une valeur d'exemple),
 * URL du site fournie par Netlify (URL) ou Vercel, puis origine de la requête.
 */
export function getAppUrl(req: Request): string {
  const fromEnv =
    usableUrl(process.env.NEXT_PUBLIC_APP_URL) ||
    usableUrl(process.env.URL) ||
    usableUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (fromEnv) return fromEnv;

  const origin = req.headers.get('origin');
  if (origin) return origin.replace(/\/+$/, '');

  const referer = req.headers.get('referer');
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      // ignore
    }
  }
  return 'http://localhost:3000';
}

export function buildConfirmEmailUrl(appUrl: string, hashedToken: string, type: EmailLinkType): string {
  const params = new URLSearchParams({ token_hash: hashedToken, type });
  return `${appUrl}/auth/confirm?${params.toString()}`;
}

export function buildResetPasswordUrl(appUrl: string, hashedToken: string): string {
  const params = new URLSearchParams({ token_hash: hashedToken, type: 'recovery' });
  return `${appUrl}/reset-password?${params.toString()}`;
}

/**
 * Client Supabase anon SANS persistance de session : sert uniquement à
 * vérifier un token_hash côté serveur. Aucune cookie n'est posée, donc
 * vérifier un lien ne connecte PAS l'utilisateur dans le navigateur.
 */
export function createStatelessAuthClient() {
  return createSupabaseClient(getSupabaseUrl(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/**
 * N'accepte qu'un chemin interne ("/dashboard"), jamais "//evil.com" ni
 * "https://evil.com" — protège contre les redirections ouvertes.
 */
export function safeInternalPath(path: string | null | undefined, fallback = '/dashboard'): string {
  if (!path || typeof path !== 'string') return fallback;
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return fallback;
  return path;
}
