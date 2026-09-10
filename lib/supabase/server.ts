import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Client Supabase pour Server Components et Route Handlers.
 * Respecte la session de l'utilisateur via les cookies httpOnly gérés par Supabase.
 * Utilise la clé "anon" — les policies RLS s'appliquent normalement.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Appelé depuis un Server Component : ignoré si le middleware
            // rafraîchit déjà la session.
          }
        },
      },
    }
  );
}

/**
 * Client "admin" — clé service_role, réservé aux opérations serveur
 * qui doivent contourner RLS de façon contrôlée (ex: écrire une
 * notification pour un autre utilisateur, valider une invitation).
 *
 * NE JAMAIS importer ce fichier depuis un composant "use client".
 * NE JAMAIS exposer SUPABASE_SERVICE_ROLE_KEY via NEXT_PUBLIC_*.
 */
export function createAdminClient() {
  const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
