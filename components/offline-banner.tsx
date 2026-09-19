'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/use-user';
import { WifiOff, CheckCircle2 } from 'lucide-react';

export function OfflineBanner() {
  const { isOffline } = useUser();
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const handleOnline = () => {
      setShowRestored(true);
      timer = setTimeout(() => {
        setShowRestored(false);
      }, 4000);
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (isOffline) {
    return (
      <div 
        role="alert"
        aria-live="polite"
        className="bg-green-800 text-green-50 px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 shadow-inner sticky top-0 z-50 transition-all animate-fadeIn"
      >
        <WifiOff className="w-4 h-4 shrink-0 text-green-200" />
        <span>Mode Hors-Ligne  -  Navigation sur données en cache. Les actions seront synchronisées au retour de la connexion.</span>
      </div>
    );
  }

  if (showRestored) {
    return (
      <div 
        role="status"
        aria-live="polite"
        className="bg-orange-800 text-orange-50 px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 shadow-inner sticky top-0 z-50 transition-all animate-fadeIn"
      >
        <CheckCircle2 className="w-4 h-4 shrink-0 text-orange-200" />
        <span>Connexion rétablie  -  Synchronisation de votre session UJLOG en cours.</span>
      </div>
    );
  }

  return null;
}
