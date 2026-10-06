'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, LayoutDashboard } from 'lucide-react';

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    console.error('Erreur dashboard capturée:', error?.message || 'Erreur inconnue');
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-3xl border border-ujlog-border shadow-sm p-6 text-center space-y-4">
        <div className="w-12 h-12 bg-green-50 text-green-700 rounded-2xl flex items-center justify-center mx-auto border border-green-200">
          <AlertCircle className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-bold text-ujlog-ink">
            Erreur d&apos;affichage de la section
          </h3>
          <p className="text-xs text-ujlog-ink-soft font-medium leading-relaxed">
            Impossible de charger les données pédagogiques demandées pour le moment.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="py-2 px-4 bg-orange-800 hover:bg-orange-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Réessayer</span>
          </button>

          <Link
            href="/dashboard"
            className="py-2 px-4 bg-ujlog-cream hover:bg-ujlog-border text-ujlog-ink-soft font-bold text-xs rounded-xl transition-colors flex items-center gap-2"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Tableau de bord</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
