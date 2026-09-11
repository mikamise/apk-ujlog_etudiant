import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureUserProfile } from '@/lib/server-session';

/**
 * Route de callback PKCE Supabase SSR.
 * Échange le code d'autorisation ou le token_hash contre une session utilisateur réelle et
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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const profile = await ensureUserProfile(user);

        if (next) {
          return NextResponse.redirect(new URL(next, requestUrl.origin), 303);
        }

        if (profile?.role === 'admin' || profile?.role === 'super_admin') {
          return NextResponse.redirect(new URL('/super-admin', requestUrl.origin), 303);
        }
        if (profile?.role === 'delegate') {
          return NextResponse.redirect(new URL('/dashboard/delegue', requestUrl.origin), 303);
        }
      }

      if (next) {
        return NextResponse.redirect(new URL(next, requestUrl.origin), 303);
      }
      return NextResponse.redirect(new URL('/dashboard', requestUrl.origin), 303);
    }
  }

  if (token_hash) {
    const effectiveType = type || 'signup';
    let { error } = await supabase.auth.verifyOtp({
      type: effectiveType as any,
      token_hash,
    });

    if (error && !type) {
      // Si type n'était pas précisé, retenter avec 'email' puis 'recovery'
      const retryEmail = await supabase.auth.verifyOtp({ type: 'email' as any, token_hash });
      if (!retryEmail.error) error = null;
      else {
        const retryRecovery = await supabase.auth.verifyOtp({ type: 'recovery' as any, token_hash });
        if (!retryRecovery.error) {
          error = null;
          return NextResponse.redirect(new URL('/reset-password', requestUrl.origin), 303);
        }
      }
    }

    if (!error) {
      if (effectiveType === 'recovery') {
        return NextResponse.redirect(new URL('/reset-password', requestUrl.origin), 303);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const profile = await ensureUserProfile(user);

        if (next) {
          return NextResponse.redirect(new URL(next, requestUrl.origin), 303);
        }

        if (profile?.role === 'admin' || profile?.role === 'super_admin') {
          return NextResponse.redirect(new URL('/super-admin', requestUrl.origin), 303);
        }
        if (profile?.role === 'delegate') {
          return NextResponse.redirect(new URL('/dashboard/delegue', requestUrl.origin), 303);
        }
      }

      return NextResponse.redirect(new URL(next || '/dashboard', requestUrl.origin), 303);
    }
  }

  // Si ni code ni token_hash n'étaient présents dans les paramètres de requête côté serveur,
  // les jetons sont peut-être dans le fragment hash (#access_token=...&type=signup|recovery)
  // que le navigateur n'envoie jamais au serveur par HTTP.
  const htmlBridge = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Vérification UJLOG Étudiant...</title>
</head>
<body style="font-family:sans-serif;background:#fff8f1;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <p style="color:#7c2d12;font-weight:bold;font-size:14px;">Vérification de votre compte en cours...</p>
  <script>
    if (window.location.hash) {
      var hash = window.location.hash;
      if (hash.indexOf('type=recovery') !== -1) {
        window.location.replace('/reset-password' + hash);
      } else {
        window.location.replace('/auth/confirm' + hash);
      }
    } else {
      window.location.replace('/login?error=Lien+invalide+ou+expire');
    }
  </script>
</body>
</html>`;

  return new NextResponse(htmlBridge, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
