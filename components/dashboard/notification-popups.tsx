'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, X, ExternalLink } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

type NotificationRow = {
  id: string;
  title?: string | null;
  message?: string | null;
  type?: string | null;
  is_read?: boolean;
  isRead?: boolean;
  created_at?: string | null;
  reference?: { course_id?: string; level_code?: string } | null;
};

/** Shows newly-created server notifications while the authenticated app is open.
 *  Existing notifications are seeded on first load so they are not replayed as popups.
 */
export function NotificationPopups() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const initialized = useRef(false);
  const seen = useRef<Set<string>>(new Set());
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!('Notification' in window)) setPermission('unsupported');
    else setPermission(Notification.permission);

    try {
      const cached = sessionStorage.getItem('ujlog-notification-seen-v1');
      if (cached) seen.current = new Set(JSON.parse(cached) as string[]);
    } catch { /* storage peut être désactivé */ }

    let stopped = false;
    const poll = async () => {
      if (document.visibilityState === 'prerender') return;
      try {
        const response = await fetch('/api/notifications?limit=20', { cache: 'no-store', credentials: 'same-origin' });
        if (response.status === 401 || !response.ok) return;
        const payload = await response.json();
        if (!payload?.success || !Array.isArray(payload.data) || stopped) return;
        const rows = payload.data as NotificationRow[];
        if (!initialized.current) {
          rows.forEach((row) => seen.current.add(row.id));
          initialized.current = true;
          try { sessionStorage.setItem('ujlog-notification-seen-v1', JSON.stringify([...seen.current].slice(-200))); } catch {}
          return;
        }
        const fresh = rows.filter((row) => row.id && !seen.current.has(row.id)).reverse();
        if (!fresh.length) return;
        fresh.forEach((row) => seen.current.add(row.id));
        try { sessionStorage.setItem('ujlog-notification-seen-v1', JSON.stringify([...seen.current].slice(-200))); } catch {}
        setItems((current) => [...current, ...fresh].slice(-3));
        if (document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          for (const row of fresh) {
            await registration.showNotification(row.title || 'UJLOG Étudiant', {
              body: row.message || 'Une nouvelle notification universitaire est disponible.',
              icon: '/icon-192.png',
              badge: '/icon-192.png',
              tag: `ujlog-${row.id}`,
              data: { url: row.reference?.course_id ? `/dashboard/cours/${encodeURIComponent(row.reference.course_id)}` : '/dashboard/notifications' },
            });
          }
        }
      } catch { /* l'app reste utilisable si le réseau est momentanément absent */ }
    };
    void poll();
    const interval = window.setInterval(() => { if (navigator.onLine) void poll(); }, 25_000);
    const onVisible = () => { if (document.visibilityState === 'visible' && navigator.onLine) void poll(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);
    return () => { stopped = true; window.clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('online', onVisible); };
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    const timer = window.setTimeout(() => setItems((current) => current.slice(1)), 7000);
    return () => window.clearTimeout(timer);
  }, [items]);

  if (!items.length) return null;
  return <div aria-live="polite" aria-relevant="additions" className="fixed right-3 top-3 z-[100] flex w-[min(92vw,390px)] flex-col gap-2" data-path={pathname}>
    {items.map((item) => <div key={item.id} className="rounded-2xl border border-orange-200 bg-white p-4 text-stone-900 shadow-2xl ring-1 ring-black/5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700"><Bell className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-wide text-orange-700">UJLOG · Notification</p><p className="mt-1 font-bold">{item.title || 'Nouvelle notification'}</p><p className="mt-1 text-sm leading-5 text-stone-600">{item.message || 'Une nouvelle information est disponible.'}</p><button type="button" onClick={() => { setItems((current) => current.filter((n) => n.id !== item.id)); router.push(item.reference?.course_id ? `/dashboard/cours/${encodeURIComponent(item.reference.course_id)}` : '/dashboard/notifications'); }} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-orange-700 hover:text-orange-800">Ouvrir <ExternalLink className="h-3.5 w-3.5" /></button></div>
        <button type="button" aria-label="Fermer la notification" onClick={() => setItems((current) => current.filter((n) => n.id !== item.id))} className="rounded-lg p-1 text-stone-500 hover:bg-stone-100"><X className="h-4 w-4" /></button>
      </div>
    </div>)}
    {permission === 'default' && <button type="button" onClick={() => router.push('/dashboard/parametres')} className="self-end rounded-full bg-stone-900 px-3 py-2 text-xs font-semibold text-white shadow-lg">Activer les notifications système</button>}
  </div>;
}
