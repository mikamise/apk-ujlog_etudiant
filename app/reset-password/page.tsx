'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowLeft, CheckCircle, AlertTriangle, Loader2, KeyRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PasswordStrengthMeter, evaluatePassword } from '@/components/auth/password-strength-meter';
import { ClientAuthService } from '@/lib/client-auth-service';

type LinkState = 'checking' | 'valid' | 'invalid';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      {/* Header mobile uniquement */}
      <header className="lg:hidden w-full max-w-[420px] mb-3">
        <Link href="/login" className="flex items-center gap-2 text-ujlog-ink-soft hover:text-ujlog-ink transition-colors group w-fit">
          <div className="w-8 h-8 rounded-xl bg-ujlog-cream border border-ujlog-border flex items-center justify-center group-hover:border-ujlog-primary/40 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider">Retour</span>
        </Link>
      </header>

      <div className="bg-white w-full max-w-[420px] rounded-3xl shadow-soft-warm border border-ujlog-border p-7 sm:p-9 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white shadow-md border border-ujlog-border flex items-center justify-center p-2 mx-auto mb-5">
          <div className="relative w-full h-full">
            <Image src="/logo-geographie.jpg" alt="Logo Département de Géographie" fill className="object-contain rounded-lg" referrerPolicy="no-referrer" />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [linkState, setLinkState] = useState<LinkState>('checking');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const passwordEvaluation = evaluatePassword(password);

  const [tokenHash, setTokenHash] = useState<string | null>(null);

  // Lien actuel : /reset-password?token_hash=...&type=recovery -> le jeton est
  // simplement conservé ; il n'est vérifié (et consommé) par le serveur qu'au
  // moment de valider le nouveau mot de passe.
  // Anciens liens : jetons dans le fragment (#access_token=...) ou session
  // "recovery" déjà posée par /auth/callback.
  useEffect(() => {
    let cancelled = false;

    const initRecovery = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParam = searchParams.get('token_hash');

      if (hashParam) {
        setTokenHash(hashParam);
        setLinkState('valid');
        return;
      }

      const supabase = createClient();
      const hash = window.location.hash ? new URLSearchParams(window.location.hash.substring(1)) : null;
      const hashAccessToken = hash?.get('access_token');
      const hashRefreshToken = hash?.get('refresh_token');

      if (hashAccessToken && hashRefreshToken) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken,
          });
          if (!cancelled && !error && data.user) {
            window.history.replaceState(null, '', window.location.pathname);
            setLinkState('valid');
            return;
          }
        } catch {
          // continue fallback
        }
      }

      try {
        const { data, error } = await supabase.auth.getUser();
        if (!cancelled && !error && data.user) {
          setLinkState('valid');
          return;
        }
      } catch {
        // continue
      }

      if (!cancelled) {
        setLinkState('invalid');
      }
    };

    initRecovery();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!passwordEvaluation.isAllMandatoryMet) {
      setError('Le mot de passe doit comporter au moins 8 caractères, dont une majuscule, une minuscule et un chiffre.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: password, ...(tokenHash ? { token_hash: tokenHash } : {}) }),
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.success) {
        if (payload?.code === 'INVALID_LINK') {
          setLinkState('invalid');
        } else {
          setError(payload?.error || 'Une erreur est survenue. Veuillez réessayer.');
        }
        return;
      }

      // Nettoie tout cache local : l'utilisateur doit se reconnecter.
      ClientAuthService.clearLocalState();
      setSuccess(true);
      const email = payload.email ? `&email=${encodeURIComponent(payload.email)}` : '';
      setTimeout(() => router.replace(`/login?reset=1${email}`), 2500);
    } catch {
      setError('Une erreur technique est survenue. Vérifiez votre connexion.');
    } finally {
      setIsLoading(false);
    }
  };

  if (linkState === 'checking') {
    return (
      <Shell>
        <div className="flex flex-col items-center text-center py-6 space-y-3">
          <Loader2 className="w-6 h-6 text-ujlog-primary animate-spin" />
          <p className="text-xs text-ujlog-ink-soft font-medium">Vérification du lien en cours...</p>
        </div>
      </Shell>
    );
  }

  if (linkState === 'invalid') {
    return (
      <Shell>
        <div className="text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4 border border-red-100">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h1 className="font-display text-lg font-bold text-ujlog-ink mb-2">Lien invalide ou expiré</h1>
          <p className="text-xs text-ujlog-ink-soft leading-relaxed mb-6 max-w-xs">
            Ce lien de réinitialisation n&apos;est plus valide — il a peut-être déjà été utilisé ou a expiré.
            Faites une nouvelle demande pour recevoir un lien à jour.
          </p>
          <Link
            href="/forgot-password"
            className="w-full bg-ujlog-primary-dark text-white py-3 rounded-2xl font-bold text-sm hover:brightness-105 transition-all text-center block"
          >
            Faire une nouvelle demande
          </Link>
        </div>
      </Shell>
    );
  }

  if (success) {
    return (
      <Shell>
        <div className="text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-200 text-ujlog-secondary-dark rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-7 h-7" />
          </div>
          <h1 className="font-display text-lg font-bold text-ujlog-ink mb-2">Mot de passe modifié</h1>
          <p className="text-xs text-ujlog-ink-soft leading-relaxed mb-6">
            Votre mot de passe a été réinitialisé. Redirection vers la page de connexion...
          </p>
          <button
            type="button"
            onClick={() => router.replace('/login?reset=1')}
            className="w-full bg-ujlog-primary-dark text-white py-3 rounded-2xl font-bold text-sm hover:brightness-105 transition-all cursor-pointer"
          >
            Se connecter
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-1.5 bg-ujlog-primary-light text-ujlog-primary-dark text-xs font-bold px-3 py-1.5 rounded-xl mb-3">
          <KeyRound className="w-3.5 h-3.5" />
          Nouveau mot de passe
        </span>
        <h1 className="font-display text-lg font-bold text-ujlog-ink mb-1.5">Définissez un nouveau mot de passe</h1>
        <p className="text-xs text-ujlog-ink-soft">Choisissez un mot de passe sécurisé pour votre compte.</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium border border-red-200/80 text-left">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">
            Nouveau mot de passe
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Votre mot de passe"
              className="w-full px-4 py-3 pr-11 rounded-xl border border-ujlog-border bg-ujlog-cream text-sm font-medium text-ujlog-ink placeholder:text-ujlog-ink-soft/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-ujlog-primary/20 focus:border-ujlog-primary transition-all"
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
          <PasswordStrengthMeter password={password} />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">
            Confirmer le mot de passe
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmez votre mot de passe"
              className="w-full px-4 py-3 pr-11 rounded-xl border border-ujlog-border bg-ujlog-cream text-sm font-medium text-ujlog-ink placeholder:text-ujlog-ink-soft/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-ujlog-primary/20 focus:border-ujlog-primary transition-all"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ujlog-ink-soft/70 hover:text-ujlog-ink-soft transition-colors p-1"
              aria-label="Afficher ou masquer mot de passe"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="text-[11px] text-red-600 font-medium pl-1">Les mots de passe ne correspondent pas.</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-terracotta-gradient text-white py-3.5 rounded-2xl font-bold text-sm shadow-glow-orange hover:brightness-105 transition-all disabled:opacity-70 cursor-pointer mt-2"
        >
          {isLoading ? 'Enregistrement...' : 'Réinitialiser mon mot de passe'}
        </button>
      </form>
    </Shell>
  );
}
