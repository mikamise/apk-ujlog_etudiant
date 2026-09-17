import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseUrl } from '@/lib/supabase/config';

/**
 * Client Supabase pour le navigateur (Client Components uniquement).
 * N'utilise QUE la clé publique "anon" — jamais la service role key ici.
 */
export function createClient() {
  return createBrowserClient(
    getSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
