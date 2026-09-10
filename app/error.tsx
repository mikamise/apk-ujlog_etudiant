'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalAppError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error securely without leaking sensitive stack traces to users
    console.error('Erreur capturée par ErrorBoundary:', error?.message || 'Erreur inconnue');
  }, [error]);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-3xl border border-stone-200 shadow-sm p-6 sm:p-8 text-center space-y-5">
        <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto border border-green-200/60">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold text-stone-900 tracking-tight">
            Une interruption momentanée est survenue
          </h2>
          <p className="text-xs text-stone-600 leading-relaxed">
            L&apos;application a rencontré une difficulté technique lors du chargement des données. Vos données locales restent sécurisées.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:flex-1 py-2.5 px-4 bg-orange-800 hover:bg-orange-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Réessayer</span>
          </button>
          
          <Link
            href="/"
            className="w-full sm:flex-1 py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Accueil</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
