import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureUserProfile } from '@/lib/server-session';
import { safeInternalPath } from '@/lib/auth-links';

/**
 * Callback Supabase — conservé pour les liens envoyés AVANT le passage aux
 * liens directs (/auth/confirm?token_hash=... et /reset-password?token_hash=...,
 * voir lib/auth-links.ts), et pour d'éventuels e-mails envoyés par le mailer
 * Supabase lui-même.
 *
 * Règle produit : confirmer son adresse NE connecte PAS. On confirme, on
 * ferme la session éventuellement ouverte, puis on renvoie vers /login.
 * Seule la réinitialisation de mot de passe garde la session "recovery"
 * (nécessaire pour définir le nouveau mot de passe).
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  // Chemin interne uniquement : bloque les redirections ouvertes (?next=https://site-malveillant).
  const next = safeInternalPath(requestUrl.searchParams.get('next') || requestUrl.searchParams.get('redirectTo'), '');

  const isRecovery = type === 'recovery' || next === '/reset-password';
  const redirect = (path: string) => NextResponse.redirect(new URL(path, origin), 303);

  const supabase = await createClient();
  let verified = false;
  let verifiedAsRecovery = isRecovery;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verified = !error;
  } else if (tokenHash) {
    const firstType = (type || 'email') as 'email' | 'signup' | 'recovery' | 'magiclink';
    const { error } = await supabase.auth.verifyOtp({ type: firstType, token_hash: tokenHash });
    verified = !error;
    if (!verified && !type) {
      const retry = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash });
      verified = !retry.error;
      verifiedAsRecovery = verified;
    }
  }

  if (code || tokenHash) {
    if (!verified) {
      return redirect(
        verifiedAsRecovery
          ? '/forgot-password?error=' + encodeURIComponent('Lien de réinitialisation invalide ou expiré. Faites une nouvelle demande.')
          : '/login?error=' + encodeURIComponent('Lien invalide ou expiré. Si votre compte est déjà confirmé, connectez-vous.')
      );
    }

    if (verifiedAsRecovery) {
      return redirect('/reset-password');
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await ensureUserProfile(user);
    await supabase.auth.signOut();

    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('confirmed', '1');
    if (user?.email) loginUrl.searchParams.set('email', user.email);
    if (next) loginUrl.searchParams.set('redirectTo', next);
    return NextResponse.redirect(loginUrl, 303);
  }

  // Jetons dans le fragment (#access_token=...&type=signup|recovery) : jamais
  // envoyés au serveur, on les transmet côté navigateur à la bonne page.
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
      } else if (hash.indexOf('error') !== -1) {
        window.location.replace('/auth/confirm?' + hash.substring(1));
      } else {
        window.location.replace('/auth/confirm' + hash);
      }
    } else {
      window.location.replace('/login?error=' + encodeURIComponent('Lien invalide ou expiré.'));
    }
  </script>
</body>
</html>`;

  return new NextResponse(htmlBridge, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
