'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

export default function SuperAdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Authentification échouée. Veuillez vérifier vos informations.');
        setIsLoading(false);
        return;
      }

      router.push('/super-admin');
    } catch {
      setError('Erreur réseau ou serveur. Veuillez réessayer.');
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
    } catch {
      // Message générique affiché quoi qu'il arrive : on ne révèle jamais si le compte existe.
    } finally {
      setForgotLoading(false);
      setForgotSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-terracotta-gradient text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Topographic motif + glow effects */}
      <svg className="absolute -top-20 -right-24 w-[480px] h-[480px] opacity-30 pointer-events-none" viewBox="0 0 480 480" fill="none">
        <circle cx="300" cy="120" r="90" stroke="rgba(255,247,237,0.3)" strokeWidth="1.5" />
        <circle cx="300" cy="120" r="140" stroke="rgba(255,247,237,0.2)" strokeWidth="1.5" />
        <circle cx="300" cy="120" r="190" stroke="rgba(255,247,237,0.12)" strokeWidth="1.5" />
      </svg>
      <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-green-400/20 blur-[100px] rounded-full pointer-events-none" />

      {/* Top Bar */}
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-orange-50/80 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4 text-orange-50/80" />
          <span>Retour au portail UJLOG</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="max-w-md w-full mx-auto my-auto py-6 z-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white/95 border border-ujlog-border/90 rounded-3xl p-6 sm:p-8 shadow-soft-warm backdrop-blur-xl space-y-5 text-ujlog-ink"
        >
          {/* Header */}
          <div className="text-center space-y-2.5">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="relative w-11 h-11 bg-ujlog-cream rounded-2xl p-1 border border-ujlog-border shadow-2xs">
                <Image src="/logo-ujlog.png" alt="Logo UJLOG" fill className="object-contain" referrerPolicy="no-referrer" />
              </div>
              <div className="relative w-11 h-11 bg-ujlog-cream rounded-2xl p-1 border border-ujlog-border shadow-2xs">
                <Image src="/logo-geographie.jpg" alt="Logo Département Géographie" fill className="object-contain rounded-xl" referrerPolicy="no-referrer" />
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100/90 text-ujlog-primary-dark rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-300">
              <ShieldCheck className="w-3.5 h-3.5 text-ujlog-primary-dark" />
              <span>UJLOG • Administration Centrale</span>
            </div>
            <h1 className="text-xl font-black text-ujlog-ink tracking-tight uppercase">
              SUPER ADMINISTRATEUR
            </h1>
            <p className="text-xs text-ujlog-ink-soft max-w-xs mx-auto leading-relaxed">
              Console de gestion globale et d&apos;administration de la plateforme universitaire.
            </p>
          </div>

          <p className="text-[11px] text-center text-ujlog-ink-soft bg-ujlog-cream rounded-xl p-3 border border-ujlog-border">
            L&apos;accès à cette console est strictement réservé aux comptes invités par un Super Administrateur existant. Aucune auto-inscription n&apos;est possible.
          </p>

          {/* Error Banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-ujlog-ink-soft">
                Email Administrateur
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-ujlog-ink-soft/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Entrez votre e-mail"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-ujlog-ink-soft">
                  Mot de passe
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setForgotSent(false);
                    setForgotEmail(email);
                  }}
                  className="text-[11px] text-green-700 hover:underline font-semibold cursor-pointer"
                >
                  Mot de passe oublié ?
                </button>
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-ujlog-ink-soft/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Entrez votre mot de passe"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2 bg-orange-800 hover:bg-orange-700"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-white" />
                  <span>Se connecter à la console</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 bg-white/60 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-ujlog-border rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-100 border border-green-200 rounded-xl text-green-800">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ujlog-ink uppercase">Réinitialisation du mot de passe</h3>
                <p className="text-[11px] text-ujlog-ink-soft">Espace Administrateur UJLOG</p>
              </div>
            </div>

            {forgotSent ? (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-orange-600 mx-auto" />
                <p className="text-xs font-bold text-ujlog-primary-dark">Demande enregistrée</p>
                <p className="text-[11px] text-ujlog-primary-dark">
                  Si un compte administrateur existe pour <span className="font-mono text-green-800">{forgotEmail}</span>, un e-mail de réinitialisation vient d&apos;être envoyé.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full mt-2 py-2 px-3 bg-orange-800 hover:bg-orange-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3">
                <p className="text-xs text-ujlog-ink-soft">
                  Saisissez l&apos;adresse e-mail associée à votre compte Super Administrateur pour recevoir les instructions de secours :
                </p>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Entrez votre e-mail"
                  className="w-full px-3.5 py-2.5 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                />
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="flex-1 py-2 px-3 bg-ujlog-cream hover:bg-ujlog-border text-ujlog-ink-soft font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-500 text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-60"
                  >
                    {forgotLoading ? 'Envoi…' : 'Envoyer'}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}

      {/* Footer */}
      <div className="max-w-7xl mx-auto w-full text-center text-[11px] text-ujlog-ink-soft font-medium z-10">
        © 2026 Université Jean Lorougnon Guédé • Département de Géographie. Tous droits réservés.
      </div>
    </div>
  );
}
