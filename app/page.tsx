'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Vitrine } from '@/components/vitrine/vitrine';

export default function HomePage() {
  const router = useRouter();
  const [showMarketing, setShowMarketing] = useState<boolean | null>(null);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    const isMobileViewport = window.innerWidth < 768;
    const hasSeenOnboarding =
      typeof window !== 'undefined' &&
      localStorage.getItem('ujlog_onboarding_done') === 'true';

    if ((isStandalone || isMobileViewport) && !hasSeenOnboarding) {
      router.replace('/onboarding');
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowMarketing(true);
  }, [router]);

  // Le temps de déterminer desktop/mobile, on n'affiche rien pour éviter un flash de contenu.
  if (!showMarketing) {
    return <div className="min-h-screen bg-ujlog-bg" />;
  }

  return <Vitrine />;
}
