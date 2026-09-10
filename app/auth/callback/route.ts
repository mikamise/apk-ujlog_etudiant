import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Route de callback PKCE Supabase SSR.
 * Échange le code d'autorisation contre une session utilisateur réelle et
 * positionne les cookies HttpOnly de manière sécurisée côté serveur.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') || requestUrl.searchParams.get('redirectTo');

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (next) {
        return NextResponse.redirect(new URL(next, requestUrl.origin));
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role === 'admin' || profile?.role === 'super_admin') {
          return NextResponse.redirect(new URL('/super-admin', requestUrl.origin));
        }
        if (profile?.role === 'delegate') {
          return NextResponse.redirect(new URL('/dashboard/delegue', requestUrl.origin));
        }
      }
      return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
    }
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    });
    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/reset-password', requestUrl.origin));
      }
      return NextResponse.redirect(new URL(next || '/dashboard', requestUrl.origin));
    }
  }

  // Échec de validation du jeton
  return NextResponse.redirect(new URL('/login?error=Lien+invalide+ou+expire', requestUrl.origin));
}
