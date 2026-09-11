
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
    <div className="min-h-screen bg-ujlog-cream flex flex-col">
      <header className="w-full bg-white border-b border-ujlog-border px-4 py-3 sm:px-8 sm:py-4 flex items-center justify-between">
        <Link href="/login" className="flex items-center gap-2 text-ujlog-ink-soft hover:text-ujlog-primary-dark transition-colors group">
          <div className="w-8 h-8 rounded-xl bg-ujlog-cream flex items-center justify-center group-hover:bg-ujlog-primary-light transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider hidden sm:block">Retour</span>
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="relative w-7 h-7 bg-white rounded-lg p-1 border border-ujlog-border">
            <Image src="/logo-ujlog.png" alt="Logo UJLOG" fill className="object-contain" referrerPolicy="no-referrer" />
          </div>
          <span className="font-display font-bold text-ujlog-ink tracking-tight text-sm">UJLOG ÉTUDIANT</span>
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

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const processConfirmation = async () => {
      // 1. Lire paramètres de requête et hash URL
      const token_hash = searchParams?.get('token_hash');
      const code = searchParams?.get('code');
      const type = searchParams?.get('type') || 'signup';
      const errorParam = searchParams?.get('error') || searchParams?.get('error_description');

      // 2. Hash fragment (#access_token=...&refresh_token=...)
      let hashAccessToken: string | null = null;
      let hashRefreshToken: string | null = null;
      if (typeof window !== 'undefined' && window.location.hash) {
        const hash = new URLSearchParams(window.location.hash.substring(1));
        hashAccessToken = hash.get('access_token');
        hashRefreshToken = hash.get('refresh_token');
      }

      const onVerificationSuccess = (user: any) => {
        if (user) {
          const meta = user.user_metadata || {};
          ClientAuthService.setCachedProfile({
            id: user.id,
            email: user.email || '',
            firstName: meta.first_name || '',
            lastName: meta.last_name || '',
            civility: meta.civility,
            level: meta.level_code || 'l1',
            field: meta.field_code || 'INFO',
            role: meta.role || 'student',
            studentId: meta.student_id,
            academicYear: '2026-2027',
          });
        }
        setState('success');
        setTimeout(() => {
          if (!cancelled) {
            window.location.href = '/dashboard';
          }
        }, 1200);
      };

      // Si Supabase a renvoyé un token_hash (flux PKCE direct)
      if (token_hash) {
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: (type as any) || 'signup',
          });
          if (!cancelled && !error && data.user) {
            onVerificationSuccess(data.user);
            return;
          }
        } catch {
          // continue fallback
        }
      }

      // Si Supabase a renvoyé un code PKCE
      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!cancelled && !error && data.user) {
            onVerificationSuccess(data.user);
            return;
          }
        } catch {
          // continue fallback
        }
      }

      // Si les jetons sont dans le hash (#access_token=...)
      if (hashAccessToken && hashRefreshToken) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken,
          });
          if (!cancelled && !error && data.user) {
            onVerificationSuccess(data.user);
            return;
          }
        } catch {
          // continue fallback
        }
      }

      // Vérifier si une session est déjà active
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!cancelled && !error && data.user) {
          onVerificationSuccess(data.user);
          return;
        }
      } catch {
        // continue
      }

      if (cancelled) return;

      if (errorParam) {
        setCustomError(decodeURIComponent(errorParam));
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
          <h2 className="font-display font-bold text-sm text-ujlog-ink">Validation de votre lien...</h2>
          <p className="text-xs text-ujlog-ink-soft font-medium max-w-xs">
            Vérification de l&apos;adresse e-mail et initialisation de votre session sécurisée.
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
                <div className="p-2.5 bg-green-50 text-green-800 rounded-xl text-xs font-semibold border border-green-200 text-center">
                  ✓ Nouvel e-mail envoyé ! Vérifiez votre boîte de réception.
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
        <h1 className="font-display text-lg font-bold text-ujlog-ink mb-1.5">Compte confirmé avec succès !</h1>
        <p className="text-xs text-ujlog-ink-soft leading-relaxed mb-5 max-w-xs">
          Votre adresse e-mail a été vérifiée. Votre session sécurisée est active.
        </p>

        <div className="w-full space-y-3">
          <a
            href="/dashboard"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = '/dashboard';
            }}
            className="w-full bg-terracotta-gradient text-white py-3.5 rounded-2xl font-bold text-sm hover:brightness-105 transition-all text-center flex items-center justify-center gap-2 shadow-glow-orange cursor-pointer"
          >
            <span>Accéder au tableau de bord</span>
            <ArrowRight className="w-4 h-4" />
          </a>

          <div className="flex items-center justify-center gap-2 text-xs text-ujlog-ink-soft pt-1">
            <Loader2 className="w-3.5 h-3.5 text-ujlog-primary animate-spin" />
            <span>Redirection automatique en cours...</span>
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
