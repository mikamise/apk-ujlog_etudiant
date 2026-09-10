'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useUser } from '@/hooks/use-user';
import { ShieldCheck, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface DelegateLoginProps {
  onSwitchToActivation: () => void;
  onLoginSuccess: () => void;
}

export function DelegateLogin({ onSwitchToActivation, onLoginSuccess }: DelegateLoginProps) {
  const { user, activateDelegateRole } = useUser();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Veuillez saisir votre adresse e-mail universitaire.');
      return;
    }

    if (!password) {
      setError('Veuillez saisir votre mot de passe espace délégué.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const payload = await res.json();

      if (!payload.success || !payload.user) {
        setError(payload.error || 'Identifiants délégué incorrects.');
        setIsLoading(false);
        return;
      }

      if (payload.user.role !== 'delegate' || !payload.user.delegateProfile) {
        setError('Ce compte ne possède pas de statut délégué actif.');
        setIsLoading(false);
        return;
      }

      const dp = payload.user.delegateProfile;
      activateDelegateRole({
        level: dp.level_code,
        section: dp.field_code,
        academicYear: dp.academic_year_id,
        permissions: ['publish_course', 'edit_own_course', 'delete_own_course'],
        levelCode: dp.level_code,
      });

      onLoginSuccess();
    } catch {
      setError('Une erreur technique est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto w-full py-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-3xl p-6 sm:p-8 border border-ujlog-border/90 shadow-sm space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="relative w-10 h-10 bg-ujlog-cream rounded-xl p-1 border border-ujlog-border shadow-2xs">
              <Image src="/logo-ujlog.png" alt="Logo UJLOG" fill className="object-contain" referrerPolicy="no-referrer" />
            </div>
            <div className="relative w-10 h-10 bg-ujlog-cream rounded-xl p-1 border border-ujlog-border shadow-2xs">
              <Image src="/logo-geographie.jpg" alt="Logo Département Géographie" fill className="object-contain rounded-lg" referrerPolicy="no-referrer" />
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-terracotta-gradient text-white flex items-center justify-center mx-auto shadow-glow-orange">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-extrabold text-green-700 tracking-wider block">
              Accès Réservé
            </span>
            <h1 className="text-lg sm:text-xl font-extrabold text-ujlog-primary-dark tracking-tight">
              Espace Délégué
            </h1>
          </div>
          <p className="text-xs text-ujlog-ink-soft max-w-xs mx-auto">
            Saisissez vos identifiants pour vous connecter à votre espace délégué.
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-3 bg-red-50 border border-red-200/80 rounded-2xl flex items-start gap-2.5 text-red-700 text-xs"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-semibold">{error}</span>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-ujlog-ink-soft">
              Adresse e-mail universitaire
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-ujlog-ink-soft/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Entrez votre e-mail"
                className="w-full pl-10 pr-3.5 py-2.5 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink focus:outline-none focus:ring-2 focus:ring-orange-700/20 focus:border-orange-700 transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-ujlog-ink-soft">
                Mot de passe délégué
              </label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-ujlog-ink-soft/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Entrez votre mot de passe"
                className="w-full pl-10 pr-3.5 py-2.5 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink focus:outline-none focus:ring-2 focus:ring-orange-700/20 focus:border-orange-700 transition-all font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-terracotta-gradient hover:brightness-110 active:scale-[0.99] text-white font-bold text-xs rounded-2xl shadow-glow-orange transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <span>Vérification en cours...</span>
            ) : (
              <>
                <span>Se connecter</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer / Switch to Activation */}
        <div className="pt-4 border-t border-ujlog-border text-center space-y-2">
          <p className="text-xs text-ujlog-ink-soft font-medium">
            Vous avez reçu une invitation par e-mail pour devenir délégué ? Utilisez le lien d&apos;activation qu&apos;elle contient — il vous conduit directement à la création de votre compte.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
