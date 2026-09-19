'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle, AlertTriangle, Loader2, Mail, Send, LogIn } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ClientAuthService } from '@/lib/client-auth-service';

type ConfirmState = 'checking' | 'success' | 'invalid';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="w-full bg-white border-b border-ujlog-border px-4 py-3 sm:px-8 sm:py-4 flex items-center justify-between">
        <Link href="/login" className="flex items-center gap-2 text-ujlog-ink-soft hover:text-ujlog-primary-dark transition-colors group">
          <div className="w-8 h-8 rounded-xl bg-ujlog-cream flex items-center justify-center group-hover:bg-ujlog-primary-light transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider hidden sm:block">Retour</span>
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="relative w-7 h-7 bg-white rounded-lg p-1 border border-ujlog-border">
            <Image src="/logo-geographie.jpg" alt="Logo Département de Géographie" fill className="object-contain rounded-md" referrerPolicy="no-referrer" />
          </div>
          <span className="font-display font-bold text-ujlog-ink tracking-tight text-sm">UJLOG Étudiant</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-soft-warm border border-ujlog-border p-6 sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function ConfirmAccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<ConfirmState>('checking');
  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [customError, setCustomError] = useState('');

  const [confirmedEmail, setConfirmedEmail] = useState('');

  const loginUrl = confirmedEmail
    ? `/login?confirmed=1&email=${encodeURIComponent(confirmedEmail)}`
    : '/login?confirmed=1';

  useEffect(() => {
    let cancelled = false;

    const goToLogin = (email?: string) => {
      if (cancelled) return;
      if (email) setConfirmedEmail(email);
      setState('success');
      setTimeout(() => {
        if (cancelled) return;
        const target = email ? `/login?confirmed=1&email=${encodeURIComponent(email)}` : '/login?confirmed=1';
        router.replace(target);
      }, 2500);
    };

    const processConfirmation = async () => {
      const tokenHash = searchParams?.get('token_hash');
      const type = searchParams?.get('type') || 'signup';
      const errorParam = searchParams?.get('error_description') || searchParams?.get('error');

      // 1. Lien actuel : /auth/confirm?token_hash=...&type=signup
      //    Vérifié côté serveur, sans ouvrir de session (voir /api/auth/confirm-email).
      if (tokenHash) {
        try {
          const res = await fetch('/api/auth/confirm-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token_hash: tokenHash, type }),
          });
          const payload = await res.json().catch(() => null);
          if (cancelled) return;
          if (res.ok && payload?.success) {
            goToLogin(payload.email);
            return;
          }
          setCustomError(payload?.error || '');
          setState('invalid');
        } catch {
          if (cancelled) return;
          setCustomError('Erreur réseau pendant la vérification. Vérifiez votre connexion puis rouvrez le lien.');
          setState('invalid');
        }
        return;
      }

      if (errorParam) {
        setCustomError(decodeURIComponent(errorParam.replace(/\+/g, ' ')));
        setState('invalid');
        return;
      }

      // 2. Anciens liens (envoyés avant ce correctif) : Supabase a DÉJÀ confirmé
      //    l'adresse avant de rediriger ici avec #access_token=... ou ?code=...
      //    On n'ouvre pas de session : on nettoie et on envoie vers la connexion.
      const hash = typeof window !== 'undefined' ? new URLSearchParams(window.location.hash.substring(1)) : null;
      if (hash?.get('access_token') || searchParams?.get('code')) {
        try {
          await createClient().auth.signOut({ scope: 'local' });
        } catch {
          // ignore
        }
        ClientAuthService.clearLocalState();
        goToLogin();
        return;
      }

      setState('invalid');
    };

    processConfirmation();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setResendStatus('sending');
    try {
      await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail.trim().toLowerCase() }),
      });
    } catch {
      // ignore
    } finally {
      setResendStatus('sent');
    }
  };

  if (state === 'checking') {
    return (
      <Shell>
        <div className="flex flex-col items-center text-center py-6 space-y-3">
          <Loader2 className="w-8 h-8 text-ujlog-primary animate-spin" />
          <h2 className="font-display font-bold text-sm text-ujlog-ink">Confirmation de votre adresse e-mail...</h2>
          <p className="text-xs text-ujlog-ink-soft font-medium max-w-xs">
            Merci de patienter quelques secondes.
          </p>
        </div>
      </Shell>
    );
  }

  if (state === 'invalid') {
    return (
      <Shell>
        <div className="text-center flex flex-col items-center">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-4 border border-red-100">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="font-display text-lg font-bold text-ujlog-ink mb-2">Lien invalide ou expiré</h1>
          <p className="text-xs text-ujlog-ink-soft leading-relaxed mb-4 max-w-xs">
            {customError || 'Ce lien de confirmation n’est plus actif. Il a peut-être déjà été validé, ou son délai de validité est écoulé.'}
          </p>

          <div className="w-full space-y-3 pt-2">
            {/* Action 1: Se connecter directement si déjà validé */}
            <Link
              href="/login"
              className="w-full bg-terracotta-gradient text-white py-3 rounded-2xl font-bold text-sm hover:brightness-105 transition-all text-center flex items-center justify-center gap-2 shadow-glow-orange cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Tenter de vous connecter</span>
            </Link>

            {/* Action 2: Renvoyer un nouveau lien directement depuis cette page */}
            <div className="p-4 bg-ujlog-cream/80 rounded-2xl border border-ujlog-border text-left mt-3">
              <p className="text-xs font-bold text-ujlog-ink mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-ujlog-primary-dark" />
                <span>Recevoir un nouveau lien</span>
              </p>
              <p className="text-[11px] text-ujlog-ink-soft mb-3">
                Saisissez votre e-mail pour générer immédiatement un lien valide.
              </p>

              {resendStatus === 'sent' ? (
                <div className="p-2.5 bg-green-50 text-green-800 rounded-xl text-xs font-semibold border border-green-200 text-center flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Nouvel e-mail envoyé ! Vérifiez votre boîte de réception.</span>
                </div>
              ) : (
                <form onSubmit={handleResend} className="space-y-2">
                  <input
                    type="email"
                    required
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="votre.email@ujlog.ci"
                    className="w-full px-3 py-2.5 rounded-xl border border-ujlog-border bg-white text-xs font-medium text-ujlog-ink placeholder:text-ujlog-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-ujlog-primary/20"
                  />
                  <button
                    type="submit"
                    disabled={resendStatus === 'sending'}
                    className="w-full bg-white border border-ujlog-border hover:border-ujlog-primary-dark text-ujlog-ink font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <Send className="w-3 h-3 text-ujlog-primary-dark" />
                    <span>{resendStatus === 'sending' ? 'Envoi en cours...' : 'Renvoyer le lien'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="text-center flex flex-col items-center py-2">
        <div className="w-14 h-14 bg-ujlog-secondary-50 text-ujlog-secondary rounded-2xl flex items-center justify-center mb-4 border border-ujlog-secondary-100">
          <CheckCircle className="w-7 h-7" />
        </div>
        <h1 className="font-display text-lg font-bold text-ujlog-ink mb-1.5">Adresse e-mail confirmée !</h1>
        <p className="text-xs text-ujlog-ink-soft leading-relaxed mb-5 max-w-xs">
          Votre compte est activé. Connectez-vous maintenant avec votre adresse e-mail et votre mot de passe pour accéder à votre tableau de bord.
        </p>

        <div className="w-full space-y-3">
          <Link
            href={loginUrl}
            className="w-full bg-terracotta-gradient text-white py-3.5 rounded-2xl font-bold text-sm hover:brightness-105 transition-all text-center flex items-center justify-center gap-2 shadow-glow-orange cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Se connecter</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <div className="flex items-center justify-center gap-2 text-xs text-ujlog-ink-soft pt-1">
            <Loader2 className="w-3.5 h-3.5 text-ujlog-primary animate-spin" />
            <span>Redirection vers la page de connexion...</span>
          </div>
        </div>
      </div>
    </Shell>
  );
}

export default function ConfirmAccountPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <div className="flex flex-col items-center text-center py-6 space-y-3">
            <Loader2 className="w-6 h-6 text-ujlog-primary animate-spin" />
            <p className="text-xs text-ujlog-ink-soft font-medium">Chargement...</p>
          </div>
        </Shell>
      }
    >
      <ConfirmAccountContent />
    </Suspense>
  );
}
