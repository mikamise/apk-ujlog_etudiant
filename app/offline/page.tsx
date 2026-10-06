'use client';

import Image from 'next/image';

export default function OfflinePage() {
  return (
    <main className="min-h-[100dvh] bg-white px-6 flex items-center justify-center text-center">
      <div className="w-full max-w-sm">
        <div className="mx-auto h-16 w-16 rounded-[20px] border border-ujlog-border bg-white p-3 shadow-soft-warm">
          <Image
            src="/icon-192.png"
            alt="UJLOG"
            width={40}
            height={40}
            className="h-full w-full object-contain"
          />
        </div>

        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-ujlog-ink">
          Connexion indisponible
        </h1>

        <p className="mt-3 text-sm leading-6 text-ujlog-ink-soft">
          Vous êtes hors connexion. Les documents déjà téléchargés restent
          disponibles depuis votre espace de téléchargements.
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-7 h-12 w-full rounded-2xl bg-ujlog-primary px-5 text-sm font-bold text-white shadow-soft-warm hover:bg-ujlog-primary-dark"
        >
          Réessayer
        </button>
      </div>
    </main>
  );
}
