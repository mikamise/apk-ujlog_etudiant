'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    // Check if already running in standalone display mode
    if (
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true)
    ) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
    } catch (err) {
      console.debug('PWA Install prompt error:', err);
    } finally {
      setDeferredPrompt(null);
    }
  };

  // Strictly render ONLY when real native prompt event was captured
  if (!deferredPrompt || isInstalled || dismissed) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-label="Installer l'application UJLOG Étudiants"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 bg-white/98 backdrop-blur-md border border-ujlog-border text-ujlog-ink p-4 rounded-2xl shadow-card-hover transition-all animate-fadeIn"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-terracotta-gradient rounded-xl text-white shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-ujlog-ink">
              Installer UJLOG Étudiants
            </h4>
            <p className="text-[11px] text-ujlog-ink-soft leading-tight">
              Installez l&apos;application sur votre écran d&apos;accueil pour un accès fluide.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 rounded-lg text-ujlog-ink-soft/60 hover:text-ujlog-ink hover:bg-ujlog-cream transition-colors cursor-pointer"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="px-3 py-1.5 text-xs font-bold text-ujlog-ink-soft hover:text-ujlog-ink transition-colors cursor-pointer"
        >
          Plus tard
        </button>
        <button
          type="button"
          onClick={handleInstallClick}
          className="px-3.5 py-1.5 bg-ujlog-secondary hover:bg-ujlog-secondary-dark text-white text-xs font-bold rounded-xl shadow-soft-warm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Installer</span>
        </button>
      </div>
    </div>
  );
}
