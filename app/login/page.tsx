'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, ArrowLeft, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { ClientAuthService } from '@/lib/client-auth-service';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(() => {
    const errorMsg = searchParams?.get('error');
    return errorMsg ? decodeURIComponent(errorMsg) : '';
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
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
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
      if (targetParam && targetParam.startsWith('/') && !targetParam.startsWith('//')) {
        router.push(targetParam);
      } else if (role === 'admin' || role === 'super_admin') {
        router.push('/super-admin');
      } else if (role === 'delegate' || result.user?.isDelegate) {
        router.push('/dashboard/delegue');
      } else {
        router.push('/dashboard');
      }
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
    <div className="min-h-screen bg-ujlog-cream flex flex-col relative overflow-hidden">

      {/* Subtle topographic motif, kept quiet on the light background */}
      <svg className="absolute -top-16 -right-16 w-72 h-72 opacity-[0.06] pointer-events-none" viewBox="0 0 480 480" fill="none">
        <circle cx="300" cy="120" r="70" stroke="#ff7a00" strokeWidth="1.5" />
        <circle cx="300" cy="120" r="105" stroke="#ff7a00" strokeWidth="1.5" />
        <circle cx="300" cy="120" r="140" stroke="#ff7a00" strokeWidth="1.5" />
      </svg>

      {/* Header */}
      <header className="relative z-10 w-full px-4 py-4 sm:px-8 sm:py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-ujlog-ink-soft hover:text-ujlog-ink transition-colors group">
          <div className="w-8 h-8 rounded-xl bg-white border border-ujlog-border flex items-center justify-center group-hover:border-ujlog-primary/40 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider hidden sm:block">Retour</span>
        </Link>
        <span className="font-display font-bold text-ujlog-ink tracking-tight text-sm">UJLOG ÉTUDIANT</span>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 py-6">
        <div className="w-full max-w-sm">

          {/* Institutional badge, centered above the form like the reference screens */}
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-soft-warm border border-ujlog-border flex items-center justify-center p-2.5">
              <div className="relative w-full h-full">
                <Image src="/logo-ujlog.png" alt="Logo UJLOG" fill className="object-contain" referrerPolicy="no-referrer" />
              </div>
            </div>
          </div>

          <div className="text-center space-y-1.5 mb-6">
            <h1 className="font-display text-xl font-bold text-ujlog-ink tracking-tight">Bienvenue !</h1>
            <p className="text-xs text-ujlog-ink-soft font-medium">
              Connectez-vous à votre compte
            </p>
          </div>

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
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Entrez votre email"
                className="w-full px-4 py-3 rounded-2xl border border-ujlog-border bg-white text-sm font-medium text-ujlog-ink placeholder:text-ujlog-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-ujlog-primary/20 focus:border-ujlog-primary transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Entrez votre mot de passe"
                  className="w-full px-4 py-3 pr-11 rounded-2xl border border-ujlog-border bg-white text-sm font-medium text-ujlog-ink placeholder:text-ujlog-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-ujlog-primary/20 focus:border-ujlog-primary transition-all"
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
              <div className="flex justify-end pt-0.5">
                <Link href="/forgot-password" className="text-[11px] font-bold text-ujlog-primary hover:text-ujlog-primary-dark transition-colors">
                  Mot de passe oublié ?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-1 bg-terracotta-gradient text-white py-3.5 rounded-2xl font-bold text-sm shadow-glow-orange hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-70 cursor-pointer flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoading ? 'Connexion en cours…' : 'Se connecter'}</span>
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

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-[10px] text-ujlog-ink-soft/70">
        © 2026 Université Jean Lorougnon Guédé, Département de Géographie. Tous droits réservés.
      </footer>

    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-ujlog-cream flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}

