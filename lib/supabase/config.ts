/**
 * URL du projet Supabase, normalisée.
 *
 * Erreur de configuration fréquente : coller l'URL de l'API REST
 * ("https://xxx.supabase.co/rest/v1/") au lieu de l'URL du projet. Le SDK
 * ajoute lui-même /rest/v1 et /auth/v1 : toutes les requêtes partaient alors
 * vers ".../rest/v1/rest/v1/..." et échouaient (connexion, inscription...).
 */
export function getSupabaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  return raw.replace(/\/+$/, '').replace(/\/(rest|auth)\/v1$/, '').replace(/\/+$/, '');
}
