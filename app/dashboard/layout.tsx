'use client';

import { useUser } from '@/hooks/use-user';
import { DashboardNavigation } from '@/components/dashboard/navigation';
import Link from 'next/link';
import { ShieldAlert, ArrowRight, UserPlus, LogIn, WifiOff } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading, isOffline } = useUser();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-terracotta-gradient flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-orange-50/85">Chargement de votre espace étudiant</p>
        </div>
      </div>
    );
  }

  // If user is not authenticated and hasn't registered an account
  if (!isAuthenticated && !user.email) {
    return (
      <div className="min-h-screen bg-terracotta-gradient flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        <svg className="absolute -top-24 -right-28 w-[480px] h-[480px] opacity-30 pointer-events-none" viewBox="0 0 480 480" fill="none">
          <circle cx="300" cy="120" r="90" stroke="rgba(255,247,237,0.3)" strokeWidth="1.5" />
          <circle cx="300" cy="120" r="140" stroke="rgba(255,247,237,0.2)" strokeWidth="1.5" />
          <circle cx="300" cy="120" r="190" stroke="rgba(255,247,237,0.12)" strokeWidth="1.5" />
        </svg>
        <div className="bg-ujlog-cream-2 max-w-md w-full rounded-[32px] border border-white/60 shadow-soft-warm p-6 sm:p-8 text-center space-y-5 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-green-gradient text-white shadow-glow-green flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <h1 className="font-display text-base sm:text-lg font-bold text-ujlog-ink tracking-tight">
              Accès réservé aux étudiants UJLOG
            </h1>
            <p className="text-xs text-ujlog-ink-soft font-normal leading-relaxed">
              Pour accéder aux cours, examens et documents pédagogiques, vous devez obligatoirement être connecté avec votre compte étudiant officiel.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <Link
              href="/register"
              className="w-full flex items-center justify-center gap-2 bg-terracotta-gradient text-white font-bold text-xs py-3 px-4 rounded-2xl hover:brightness-110 transition-all shadow-glow-orange"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Créer mon compte étudiant</span>
              <ArrowRight className="w-3 h-3" />
            </Link>

            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 bg-ujlog-cream border border-ujlog-border text-ujlog-ink-soft font-bold text-xs py-3 px-4 rounded-2xl hover:bg-white transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Se connecter à mon compte</span>
            </Link>
          </div>

          <div className="pt-2 border-t border-ujlog-border">
            <Link href="/" className="text-[11px] font-semibold text-ujlog-ink-soft/70 hover:text-ujlog-ink-soft transition-colors">
              Revenir à l&apos;accueil du site
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ujlog-bg flex flex-col lg:flex-row w-full overflow-x-hidden pb-16 lg:pb-0">
      <DashboardNavigation />
      <main className="flex-1 flex flex-col min-w-0">
        {isOffline && (
          <div className="bg-green-600 text-white text-[11px] font-semibold px-4 py-2 flex items-center justify-center gap-2 sticky top-0 z-50 shadow-xs">
            <WifiOff className="w-3.5 h-3.5 shrink-0 animate-pulse" />
            <span>Mode Hors Ligne  -  Vos ressources en cache restent disponibles. Votre session reste active.</span>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
