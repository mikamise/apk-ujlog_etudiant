
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowLeft, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PasswordStrengthMeter, evaluatePassword } from '@/components/auth/password-strength-meter';

type LinkState = 'checking' | 'valid' | 'invalid';

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

  // Le lien de réinitialisation reçu par e-mail peut transmettre un token_hash,
  // un code PKCE ou des jetons dans le fragment hash (#access_token=...).
  // On échange activement ces jetons pour valider la session recovery.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const initRecovery = async () => {
      // 1. Lire paramètres URL
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');
      const token_hash = searchParams.get('token_hash');

      // 2. Hash fragment (#access_token=...&type=recovery)
      let hashAccessToken: string | null = null;
      let hashRefreshToken: string | null = null;
      if (window.location.hash) {
        const hash = new URLSearchParams(window.location.hash.substring(1));
        hashAccessToken = hash.get('access_token');
        hashRefreshToken = hash.get('refresh_token');
      }

      if (token_hash) {
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: 'recovery',
          });
          if (!cancelled && !error && data.user) {
            setLinkState('valid');
            return;
          }
        } catch {
          // continue fallback
        }
      }

      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!cancelled && !error && data.user) {
            setLinkState('valid');
            return;
          }
        } catch {
          // continue fallback
        }
      }

      if (hashAccessToken && hashRefreshToken) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken,
          });
          if (!cancelled && !error && data.user) {
            setLinkState('valid');
            return;
          }
        } catch {
          // continue fallback
        }
      }

      // Vérifier si la session recovery existe déjà (ex. posée par /auth/callback)
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
      setError('Le mot de passe ne respecte pas les critères de sécurité obligatoires.');
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
        body: JSON.stringify({ newPassword: password }),
      });
      const payload = await res.json().catch(() => null);

if (!res.ok || !payload?.success) {
        if (payload?.error?.toLowerCase().includes('expiré') || payload?.error?.toLowerCase().includes('invalide')) {
          setLinkState('invalid');
        } else {
          setError(payload?.error || 'Une erreur est survenue. Veuillez réessayer.');
        }
        setIsLoading(false);
        return;
      }

      setSuccess(true);
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
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-4 border border-red-100">
            <AlertTriangle className="w-6 h-6" />
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
          <div className="w-14 h-14 bg-ujlog-secondary-50 text-ujlog-secondary rounded-2xl flex items-center justify-center mb-4 border border-ujlog-secondary-100">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h1 className="font-display text-lg font-bold text-ujlog-ink mb-2">Mot de passe modifié</h1>
          <p className="text-xs text-ujlog-ink-soft leading-relaxed mb-6">
            Votre mot de passe a été réinitialisé avec succès. Vous pouvez désormais vous connecter avec vos nouveaux identifiants.
          </p>
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="w-full bg-ujlog-primary-dark text-white py-3 rounded-2xl font-bold text-sm hover:brightness-105 transition-all cursor-pointer"
          >
            Retour à la connexion
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="text-center mb-6">
        <h1 className="font-display text-lg font-bold text-ujlog-ink mb-1.5">Nouveau mot de passe</h1>
        <p className="text-xs text-ujlog-ink-soft">Définissez un nouveau mot de passe sécurisé pour votre compte.</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium border border-red-200/80">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="Entrez votre mot de passe"
              className="w-full px-4 py-3 pr-11 rounded-2xl border border-ujlog-border bg-white text-sm font-medium text-ujlog-ink placeholder:text-ujlog-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-ujlog-primary/20 focus:border-ujlog-primary transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ujlog-ink-soft/70 hover:text-ujlog-ink-soft transition-colors p-1"
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
              className="w-full px-4 py-3 pr-11 rounded-2xl border border-ujlog-border bg-white text-sm font-medium text-ujlog-ink placeholder:text-ujlog-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-ujlog-primary/20 focus:border-ujlog-primary transition-all"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ujlog-ink-soft/70 hover:text-ujlog-ink-soft transition-colors p-1"
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
          className="w-full bg-ujlog-primary-dark text-white py-3.5 rounded-2xl font-bold text-sm hover:brightness-105 transition-all disabled:opacity-70 cursor-pointer mt-2"
        >
          {isLoading ? 'Enregistrement...' : 'Réinitialiser mon mot de passe'}
        </button>
      </form>
    </Shell>
  );
}
