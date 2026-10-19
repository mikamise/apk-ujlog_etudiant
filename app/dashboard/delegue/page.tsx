'use client';

import { useState, useEffect } from 'react';
import { ClientAuthService } from '@/lib/client-auth-service';
import { DelegateDashboardView } from '@/components/delegate/delegate-dashboard-view';
import {
  ArrowLeft,
  Loader2,
  ShieldX,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DelegatePage() {
  const router = useRouter();

  const [checkingSession, setCheckingSession] =
    useState(true);

  const [authorized, setAuthorized] =
    useState<boolean | null>(null);

  const checkSession = async () => {
    const auth =
      await ClientAuthService.verifySession();

    const user = auth.user;

    const isAuthorized = Boolean(
      auth.authenticated &&
        user?.role === 'delegate' &&
        user?.isDelegate
    );

    setAuthorized(isAuthorized);

    if (!isAuthorized) {
      setCheckingSession(false);
      return;
    }

    setCheckingSession(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void checkSession();
  }, []);

  const handleLogoutDelegate = () => {
    // Quitter l’espace ne déconnecte pas le compte général.
    router.push('/dashboard');
  };

  if (!checkingSession && authorized === false) {
    return (
      <div className="p-6 sm:p-10 max-w-xl mx-auto w-full">
        <div className="rounded-3xl border border-orange-200 bg-white p-6 sm:p-8 shadow-soft-warm text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-orange-50 text-orange-700 flex items-center justify-center">
            <ShieldX
              className="w-6 h-6"
              aria-hidden="true"
            />
          </div>

          <h1 className="text-lg font-bold text-ujlog-ink">
            Accès non autorisé
          </h1>

          <p className="mt-2 text-sm leading-6 text-ujlog-ink-soft">
            Cet espace est réservé aux utilisateurs
            disposant d’un profil délégué actif.
          </p>

          <button
            type="button"
            onClick={() =>
              router.push('/dashboard')
            }
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-stone-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 transition-colors"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  if (checkingSession) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-ujlog-primary-dark" />
      </div>
    );
  }

  // Le rôle délégué est porté par la session Supabase générale.
  // Aucun second login et aucune seconde session ne doivent exister.

  return (
    <div className="w-full">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <button
          type="button"
          onClick={handleLogoutDelegate}
          className="inline-flex items-center gap-2 text-xs font-semibold text-ujlog-ink-soft hover:text-ujlog-ink transition-colors"
        >
          <ArrowLeft
            className="w-4 h-4"
            strokeWidth={1.8}
          />

          Retour au dashboard
        </button>
      </div>

      <DelegateDashboardView
        onLogoutDelegate={handleLogoutDelegate}
      />
    </div>
  );
}
