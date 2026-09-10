'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, ArrowLeft, CheckCircle2, CheckCheck, Clock, Loader2, Info } from 'lucide-react';
import Link from 'next/link';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  targetLevel?: string;
  courseId?: string;
  isRead: boolean;
  createdAt: string;
}

interface RawNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read?: boolean;
  isRead?: boolean;
  created_at?: string;
  createdAt?: string;
  reference?: { level_code?: string; course_id?: string } | null;
}

function mapNotification(raw: RawNotification): NotificationItem {
  const reference = raw.reference || {};
  return {
    id: raw.id,
    title: raw.title,
    message: raw.message,
    type: raw.type,
    isRead: raw.is_read ?? raw.isRead ?? false,
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    targetLevel: reference.level_code || undefined,
    courseId: reference.course_id || undefined,
  };
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [markingAll, setMarkingAll] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    fetch('/api/notifications')
      .then((res) => res.json())
      .then((payload) => {
        if (active) {
          if (payload.success && Array.isArray(payload.data)) {
            setNotifications(payload.data.map(mapNotification));
            setUnreadCount(payload.unreadCount || 0);
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // safe fallback
    }
  };

  const markAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // safe fallback
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-ujlog-ink-soft hover:text-ujlog-primary-dark transition-colors font-semibold text-xs mb-1.5 group"
          >
            <div className="w-6 h-6 rounded-lg bg-white border border-ujlog-border flex items-center justify-center group-hover:bg-orange-50 transition-colors">
              <ArrowLeft className="w-3 h-3" />
            </div>
            <span>Tableau de bord</span>
          </Link>
          <h1 className="font-display text-base sm:text-lg font-bold text-ujlog-ink tracking-tight">
            Notifications Universitaires
          </h1>
          <p className="text-ujlog-ink-soft font-normal text-xs mt-0.5">
            Alertes officielles, publications de cours et avis de l’administration UJLOG.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            disabled={markingAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-terracotta-gradient text-white rounded-2xl text-xs font-bold shadow-glow-orange hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Tout marquer comme lu</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-ujlog-ink-soft/60 font-semibold text-xs flex items-center justify-center gap-2 bg-white rounded-2xl border border-ujlog-border shadow-2xs">
          <Loader2 className="w-4 h-4 animate-spin text-ujlog-primary-dark" />
          <span>Chargement de vos notifications...</span>
        </div>
      ) : notifications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-ujlog-border p-8 sm:p-12 shadow-2xs text-center flex flex-col items-center space-y-3 max-w-lg mx-auto"
        >
          <div className="w-12 h-12 bg-ujlog-cream/90 rounded-2xl flex items-center justify-center text-ujlog-ink-soft/60">
            <Bell className="w-6 h-6" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-ujlog-ink tracking-tight">
            Aucune nouvelle notification
          </h2>
          <p className="text-ujlog-ink-soft font-normal text-xs leading-relaxed max-w-xs">
            Vous êtes à jour. Les alertes de publication de nouveaux cours et dates d&apos;examens s&apos;afficheront ici.
          </p>
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-ujlog-primary-dark text-xs font-semibold rounded-full border border-orange-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />
              Système synchronisé
            </span>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {notifications.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`p-4 rounded-2xl border transition-all ${
                  notif.isRead
                    ? 'bg-white border-ujlog-border text-ujlog-ink-soft shadow-2xs'
                    : 'bg-gradient-to-br from-orange-50 to-ujlog-secondary-50 border-orange-200/90 shadow-soft-warm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        notif.isRead
                          ? 'bg-ujlog-cream text-ujlog-ink-soft'
                          : 'bg-terracotta-gradient text-white shadow-glow-orange'
                      }`}
                    >
                      <Info className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-bold text-ujlog-ink">
                          {notif.title}
                        </h3>
                        {!notif.isRead && (
                          <span className="px-1.5 py-0.5 bg-orange-600 text-white text-[9px] font-extrabold uppercase rounded tracking-wider">
                            Nouveau
                          </span>
                        )}
                        {notif.targetLevel && (
                          <span className="px-1.5 py-0.5 bg-ujlog-cream text-ujlog-ink-soft text-[10px] font-bold rounded">
                            {notif.targetLevel.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ujlog-ink-soft font-normal leading-relaxed">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-3 pt-1">
                        <div className="flex items-center gap-1.5 text-[10px] text-ujlog-ink-soft/60">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(notif.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {notif.courseId && (
                          <Link
                            href={`/dashboard/cours?niveau=${notif.targetLevel || 'l1'}&open=${notif.courseId}`}
                            onClick={() => !notif.isRead && markAsRead(notif.id)}
                            className="text-[11px] font-bold text-ujlog-primary-dark hover:underline"
                          >
                            Voir le cours →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {!notif.isRead && (
                    <button
                      onClick={() => markAsRead(notif.id)}
                      className="px-2 py-1 text-[11px] font-bold text-ujlog-primary-dark hover:bg-orange-100 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      Marquer lu
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
