import { LoaderCircle } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-ujlog-cream px-4 py-6 sm:px-6" aria-busy="true" aria-live="polite">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-3 w-24 rounded-full bg-white animate-pulse" aria-hidden="true" />
            <div className="h-7 w-52 rounded-lg bg-white animate-pulse" aria-hidden="true" />
          </div>
          <LoaderCircle className="h-5 w-5 animate-spin text-ujlog-primary" aria-hidden="true" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="rounded-2xl border border-ujlog-border bg-white p-5 shadow-soft-warm" aria-hidden="true">
              <div className="h-9 w-9 rounded-xl bg-ujlog-primary-light animate-pulse" />
              <div className="mt-5 h-4 w-2/3 rounded-full bg-ujlog-cream animate-pulse" />
              <div className="mt-3 h-3 w-full rounded-full bg-ujlog-cream animate-pulse" />
              <div className="mt-2 h-3 w-4/5 rounded-full bg-ujlog-cream animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
