import { LoaderCircle } from 'lucide-react';

export default function Loading() {
  return (
    <main
      className="min-h-screen bg-white text-ujlog-ink flex items-center justify-center px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="w-full max-w-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-ujlog-primary-light animate-pulse" aria-hidden="true" />
          <div className="space-y-2 flex-1">
            <div className="h-3 w-28 rounded-full bg-ujlog-cream animate-pulse" aria-hidden="true" />
            <div className="h-2.5 w-44 rounded-full bg-ujlog-cream animate-pulse" aria-hidden="true" />
          </div>
        </div>
        <div className="rounded-2xl border border-ujlog-border bg-white p-5 shadow-soft-warm">
          <div className="flex items-center gap-2 text-sm font-medium text-ujlog-ink-soft">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            Chargement…
          </div>
          <div className="mt-4 space-y-2" aria-hidden="true">
            <div className="h-3 w-full rounded-full bg-ujlog-cream animate-pulse" />
            <div className="h-3 w-5/6 rounded-full bg-ujlog-cream animate-pulse" />
            <div className="h-3 w-2/3 rounded-full bg-ujlog-cream animate-pulse" />
          </div>
        </div>
      </div>
    </main>
  );
}
