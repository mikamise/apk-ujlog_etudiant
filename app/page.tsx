'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Vitrine } from '@/components/vitrine/vitrine';
import { ClientAuthService } from '@/lib/client-auth-service';

export default function HomePage() {
  const router = useRouter();
  const [showMarketing, setShowMarketing] = useState<boolean | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;

    const resolveEntry = async () => {
      const session = await ClientAuthService.verifySession();
      if (!active) return;

      if (session.authenticated && session.user) {
        // UJLOG always opens on the general dashboard.
        // Role-specific spaces are secondary destinations available from the dashboard menu.
        router.replace('/dashboard');
        return;
      }

      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      const hasSeenOnboarding = localStorage.getItem('ujlog_onboarding_done') === 'true';

      // The installed app gets a first-run onboarding. The public website keeps
      // its marketing entry point, while authenticated users always enter the dashboard.
      if (isStandalone && !hasSeenOnboarding) {
        router.replace('/onboarding');
        return;
      }

      setShowMarketing(true);
      setCheckingSession(false);
    };

    resolveEntry();
    return () => { active = false; };
  }, [router]);

  if (checkingSession || !showMarketing) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6" aria-label="Ouverture de UJLOG" role="status">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-[20px] border border-ujlog-border bg-white shadow-soft-warm p-3">
            <img src="/icon-192.png" alt="UJLOG" className="w-full h-full object-contain rounded-lg" />
          </div>
          <div className="text-center mt-1">
            <p className="text-sm font-semibold text-ujlog-ink">UJLOG Étudiants</p>
            <p className="mt-1 text-xs text-ujlog-ink-soft">Préparation de votre espace…</p>
          </div>
          <div className="w-28 h-1 rounded-full bg-ujlog-primary/10 overflow-hidden">
            <div className="h-full w-1/2 rounded-full bg-ujlog-primary animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return <Vitrine />;
}
