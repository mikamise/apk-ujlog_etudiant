'use client';

import { useState, useEffect } from 'react';
import { DelegateStore } from '@/lib/delegate-store';
import { DelegateLogin } from '@/components/delegate/delegate-login';
import { DelegateActivation } from '@/components/delegate/delegate-activation';
import { DelegateDashboardView } from '@/components/delegate/delegate-dashboard-view';
import { ArrowLeft, UserCheck, ShieldAlert, Sparkles, ChevronRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';

export default function DelegatePage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<'selection' | 'delegate'>('selection');
  const [activeTab, setActiveTab] = useState<'login' | 'activation'>('login');

  const checkSession = () => {
    DelegateStore.getSessionAsync().then((session) => {
      setHasSession(Boolean(session));
      setCheckingSession(false);
    });
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleLogoutDelegate = async () => {
    await DelegateStore.logout();
    setHasSession(false);
    setActiveTab('login');
    setSelectedSpace('selection');
    router.push('/');
  };

  if (checkingSession) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-ujlog-primary-dark" />
      </div>
    );
  }

  // If delegate is selected, view delegate login / dashboard space
  if (selectedSpace === 'delegate') {
    return (
      <div className="w-full space-y-4">
        <div className="px-4 pt-4 max-w-5xl mx-auto w-full">
          <button
            type="button"
            onClick={() => setSelectedSpace('selection')}
            className="inline-flex items-center gap-2 text-ujlog-ink-soft hover:text-ujlog-primary-dark transition-colors font-bold text-xs group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-xl bg-white border border-ujlog-border/90 flex items-center justify-center group-hover:bg-orange-50 transition-colors shadow-2xs">
              <ArrowLeft className="w-3.5 h-3.5 text-ujlog-primary-dark" />
            </div>
            <span>Changer d&apos;espace de gestion</span>
          </button>
        </div>

        {hasSession ? (
          <DelegateDashboardView onLogoutDelegate={handleLogoutDelegate} />
        ) : (
          <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
            {activeTab === 'login' ? (
              <DelegateLogin
                onSwitchToActivation={() => setActiveTab('activation')}
                onLoginSuccess={() => checkSession()}
              />
            ) : (
              <DelegateActivation onSwitchToLogin={() => setActiveTab('login')} />
            )}
          </div>
        )}
      </div>
    );
  }

  // Default: 2 Cards Selection (Espace Délégué & Espace Super Admin)
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-terracotta-gradient rounded-[28px] p-6 sm:p-8 text-white shadow-glow-orange"
      >
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-green-400/25 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/14 backdrop-blur-md rounded-full border border-white/25 text-[10px] font-bold text-orange-50 uppercase tracking-widest">
            <Sparkles className="w-3 h-3 text-green-200" />
            <span>Portail d&apos;Administration</span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-orange-50 tracking-tight">
            Espaces de Gestion
          </h1>
          <p className="text-xs text-orange-50/85 leading-relaxed max-w-2xl font-normal">
            Sélectionnez votre niveau de responsabilité pour accéder à votre interface de gestion dédiée.
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          onClick={() => setSelectedSpace('delegate')}
          className="group relative p-6 sm:p-8 rounded-3xl border border-orange-200 bg-white hover:border-ujlog-primary transition-all duration-300 cursor-pointer shadow-soft-warm flex flex-col justify-between space-y-6 hover:-translate-y-0.5"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-terracotta-gradient text-white flex items-center justify-center shadow-glow-orange">
                <UserCheck className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 bg-orange-100 text-ujlog-primary-dark rounded-full border border-orange-200">
                {hasSession ? 'Délégué Connecté' : 'Accès Délégué'}
              </span>
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-lg sm:text-xl font-bold text-ujlog-ink group-hover:text-ujlog-primary-dark transition-colors">
                Espace Délégué
              </h2>
              <p className="text-xs text-ujlog-ink-soft leading-relaxed font-medium">
                Interface réservée aux délégués de promotion pour la publication des cours, TD, travaux dirigés et annonces académiques.
              </p>
            </div>
          </div>
          <div className="pt-4 border-t border-orange-100 flex items-center justify-between text-xs font-bold text-ujlog-primary-dark">
            <span>{hasSession ? 'Accéder à mon tableau de bord' : 'Se connecter comme Délégué'}</span>
            <div className="w-8 h-8 rounded-xl bg-terracotta-gradient text-white flex items-center justify-center group-hover:translate-x-1 transition-transform shadow-glow-orange">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          onClick={() => router.push('/super-admin/login')}
          className="group relative p-6 sm:p-8 rounded-3xl border border-ujlog-secondary-100 bg-white hover:border-ujlog-secondary transition-all duration-300 cursor-pointer shadow-soft-warm flex flex-col justify-between space-y-6 hover:-translate-y-0.5"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-green-gradient text-white flex items-center justify-center shadow-glow-green">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 bg-ujlog-secondary-100 text-ujlog-secondary rounded-full">
                Administration Globale
              </span>
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-lg sm:text-xl font-bold text-ujlog-ink group-hover:text-ujlog-secondary transition-colors">
                Espace Super Admin
              </h2>
              <p className="text-xs text-ujlog-ink-soft leading-relaxed font-medium">
                Console système globale : invitations, supervision des délégués et modération générale.
              </p>
            </div>
          </div>
          <div className="pt-4 border-t border-ujlog-secondary-100 flex items-center justify-between text-xs font-bold text-ujlog-secondary">
            <span>Se connecter comme Super Admin</span>
            <div className="w-8 h-8 rounded-xl bg-green-gradient text-white flex items-center justify-center group-hover:translate-x-1 transition-transform shadow-glow-green">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
