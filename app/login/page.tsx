'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, ArrowLeft, LogIn, UserPlus, AlertCircle, CheckCircle, Mail, Lock, GraduationCap, Download, RefreshCw } from 'lucide-react';
import { ClientAuthService } from '@/lib/client-auth-service';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(() => searchParams?.get('email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState(() => {
    const errorMsg = searchParams?.get('error');
    return errorMsg ? decodeURIComponent(errorMsg) : '';
  });
  const [notice] = useState(() => {
    if (searchParams?.get('confirmed') === '1') {
      return 'Votre adresse e-mail est confirmée. Connectez-vous avec votre e-mail et votre mot de passe.';
    }
    if (searchParams?.get('reset') === '1') {
      return 'Votre mot de passe a été modifié. Connectez-vous avec votre nouveau mot de passe.';
    }
    return '';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNeedsConfirmation(false);
    setResendState('idle');

    const cleanEmail = email.trim().toLowerCase();
    // Pas de trim() : un espace fait partie du mot de passe choisi.
    const cleanPassword = password;

    if (!cleanEmail || !cleanPassword.trim()) {
      setError('Veuillez renseigner votre adresse e-mail et votre mot de passe.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await ClientAuthService.login(cleanEmail, cleanPassword);

      if (!result.success) {
        setError(result.error || 'Identifiants incorrects ou compte introuvable.');
        setNeedsConfirmation(result.code === 'EMAIL_NOT_CONFIRMED');
        setIsLoading(false);
        return;
      }

      const role = result.user?.role;
      const targetParam = searchParams?.get('redirectTo');
      let destination = '/dashboard';
      if (targetParam && targetParam.startsWith('/') && !targetParam.startsWith('//')) {
        destination = targetParam;
      } else if (role === 'admin' || role === 'super_admin') {
        destination = '/super-admin';
      } else if (role === 'delegate' || result.user?.isDelegate) {
        destination = '/dashboard/delegue';
      }
      window.location.href = destination;
    } catch {
      setError('Une erreur technique est survenue. Veuillez vérifier votre connexion.');
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setResendState('sending');
    try {
      await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
    } catch {
      // Réponse générique de toute façon — on ne distingue pas l'échec réseau.
    } finally {
      setResendState('sent');
    }
  };

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-2">

      {/* ===================== PANNEAU DE MARQUE (masqué sur mobile) ===================== */}
      <div className="hidden lg:flex relative flex-col justify-between overflow-hidden bg-terracotta-gradient p-12 text-white">
        {/* Cercles décoratifs */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute bottom-1/3 right-16 w-28 h-28 rounded-full bg-white/10" />

        <Link href="/" className="relative z-10 inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Retour au site</span>
        </Link>

        <div className="relative z-10 space-y-8">
          <div className="w-28 h-28 rounded-3xl bg-white p-3.5 shadow-2xl">
            <div className="relative w-full h-full">
              <Image src="/logo-geographie.jpg" alt="Logo Département de Géographie" fill className="object-contain rounded-2xl" referrerPolicy="no-referrer" />
            </div>
          </div>

          <div>
            <h1 className="font-display text-4xl font-bold leading-tight">Bienvenue</h1>
            <p className="mt-3 text-sm text-white/85 leading-relaxed max-w-xs">
              Connectez-vous pour retrouver tous les cours, TD et sujets d&apos;examens du Département de Géographie.
            </p>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-white/90 shrink-0" />
              <span className="text-sm text-white/90">Cours classés par niveau et semestre</span>
            </div>
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-white/90 shrink-0" />
              <span className="text-sm text-white/90">Téléchargement et accès hors ligne</span>
            </div>
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-white/90 shrink-0" />
              <span className="text-sm text-white/90">Contenu mis à jour chaque semaine</span>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-[11px] text-white/60">
          © 2026 Département de Géographie, UJLoG Daloa
        </p>
      </div>

      {/* ===================== PANNEAU FORMULAIRE ===================== */}
      <div className="relative flex flex-col min-h-screen lg:min-h-0">

        {/* Header mobile uniquement (le panneau de marque le remplace en desktop) */}
        <header className="lg:hidden relative z-10 w-full px-4 py-4 sm:px-8 sm:py-5 flex items-center">
          <Link href="/" className="flex items-center gap-2 text-ujlog-ink-soft hover:text-ujlog-ink transition-colors group">
            <div className="w-8 h-8 rounded-xl bg-white border border-ujlog-border flex items-center justify-center group-hover:border-ujlog-primary/40 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider hidden sm:block">Retour</span>
          </Link>
        </header>

        <main className="relative z-10 flex-1 flex items-center justify-center p-4 py-6 sm:p-8 lg:p-12">
          <div className="w-full max-w-sm">

            {/* Logo institutionnel — mobile uniquement, le panneau de marque le montre déjà en desktop */}
            <div className="flex lg:hidden justify-center mb-5">
              <div className="w-24 h-24 rounded-3xl bg-white shadow-xl border border-ujlog-border flex items-center justify-center p-3">
                <div className="relative w-full h-full">
                  <Image src="/logo-geographie.jpg" alt="Logo Département de Géographie" fill className="object-contain" referrerPolicy="no-referrer" />
                </div>
              </div>
            </div>

            <div className="text-center lg:text-left space-y-1.5 mb-6">
              <h2 className="font-display text-2xl font-bold text-ujlog-ink tracking-tight">Connexion</h2>
              <p className="text-xs text-ujlog-ink-soft font-medium">
                Entrez vos identifiants pour continuer
              </p>
            </div>

            {notice && !error && (
              <div className="mb-4 p-3 bg-green-50 text-green-800 rounded-xl text-xs font-medium border border-green-200 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{notice}</span>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-ujlog-error-light text-ujlog-error rounded-xl text-xs font-medium border border-red-200/80 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span>{error}</span>
                  {error.includes("d'abord créer votre compte") && (
                    <div>
                      <Link href="/register" className="font-bold underline hover:text-red-900 block mt-1">
                        Créer un compte maintenant
                      </Link>
                    </div>
                  )}
                  {needsConfirmation && (
                    <div>
                      {resendState === 'sent' ? (
                        <span className="font-bold text-ujlog-secondary-dark block mt-1">
                          E-mail de confirmation renvoyé — vérifiez votre boîte de réception.
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendConfirmation}
                          disabled={resendState === 'sending'}
                          className="font-bold underline hover:text-red-900 block mt-1 cursor-pointer disabled:opacity-60"
                        >
                          {resendState === 'sending' ? 'Envoi en cours...' : "Renvoyer l'e-mail de confirmation"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-ujlog-ink-soft/60 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nom@exemple.com"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-ujlog-border bg-white text-sm font-medium text-ujlog-ink placeholder:text-ujlog-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-ujlog-primary/20 focus:border-ujlog-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">
                    Mot de passe
                  </label>
                  <Link href="/forgot-password" className="text-[11px] font-bold text-ujlog-primary hover:text-ujlog-primary-dark transition-colors">
                    Mot de passe oublié ?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-ujlog-ink-soft/60 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-11 py-3 rounded-2xl border border-ujlog-border bg-white text-sm font-medium text-ujlog-ink placeholder:text-ujlog-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-ujlog-primary/20 focus:border-ujlog-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ujlog-ink-soft/70 hover:text-ujlog-ink-soft transition-colors p-1"
                    aria-label="Afficher ou masquer mot de passe"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer select-none pt-0.5">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="w-[18px] h-[18px] rounded-md border-2 border-ujlog-border flex items-center justify-center peer-checked:bg-ujlog-primary peer-checked:border-ujlog-primary transition-colors shrink-0">
                  {rememberMe && (
                    <svg viewBox="0 0 12 10" className="w-2.5 h-2 fill-none stroke-white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 5l3.5 3.5L11 1" />
                    </svg>
                  )}
                </span>
                <span className="text-xs font-medium text-ujlog-ink-soft">Se souvenir de moi</span>
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-1 bg-terracotta-gradient text-white py-3.5 rounded-2xl font-bold text-sm shadow-glow-orange hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-70 cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Connexion en cours…</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Se connecter</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-5 mt-5 border-t border-ujlog-border text-center space-y-2.5">
              <p className="text-xs text-ujlog-ink-soft">
                Vous n&apos;avez pas de compte ?
              </p>
              <Link
                href="/register"
                className="w-full inline-flex items-center justify-center gap-2 bg-white hover:bg-ujlog-secondary-50 text-ujlog-secondary border border-ujlog-secondary-100 py-3 rounded-2xl font-bold text-xs transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Créer un compte</span>
              </Link>
            </div>

          </div>
        </main>

        <footer className="lg:hidden relative z-10 py-4 text-center text-[10px] text-ujlog-ink-soft/70">
          © 2026 Université Jean Lorougnon Guédé, Département de Géographie. Tous droits réservés.
        </footer>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
