import { LoaderCircle } from 'lucide-react';

export default function SuperAdminLoading() {
  return (
    <main className="min-h-screen bg-ujlog-cream flex items-center justify-center px-6" aria-busy="true" aria-live="polite">
      <div className="w-full max-w-md rounded-2xl border border-ujlog-border bg-white p-6 shadow-soft-warm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-ujlog-primary-light animate-pulse" aria-hidden="true" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 rounded-full bg-ujlog-cream animate-pulse" aria-hidden="true" />
            <div className="h-2.5 w-48 rounded-full bg-ujlog-cream animate-pulse" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-6 flex items-center gap-2 text-sm text-ujlog-ink-soft">
          <LoaderCircle className="h-4 w-4 animate-spin text-ujlog-primary" aria-hidden="true" />
          Ouverture de l’espace d’administration…
        </div>
      </div>
    </main>
  );
}
