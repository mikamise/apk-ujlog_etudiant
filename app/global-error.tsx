'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Erreur globale fatale capturée:', error?.message || 'Erreur inconnue');
  }, [error]);

  return (
    <html lang="fr">
      <body className="min-h-screen bg-stone-50 flex items-center justify-center p-4 antialiased text-stone-900">
        <div className="bg-white max-w-md w-full rounded-3xl border border-stone-200 shadow-sm p-6 sm:p-8 text-center space-y-5">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200/60">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-stone-900 tracking-tight">
              Incident système détecté
            </h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              Une anomalie inattendue a empêché le rendu de la page. Le service technique a été notifié.
            </p>
          </div>

          <button
            type="button"
            onClick={() => reset()}
            className="w-full py-2.5 px-4 bg-orange-800 hover:bg-orange-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recharger l&apos;application</span>
          </button>
        </div>
      </body>
    </html>
  );
}
