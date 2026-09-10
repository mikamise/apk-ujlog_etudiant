'use client';

import { Bell, CheckCircle2, AlertTriangle, Info, UserCheck, BookOpen, Clock } from 'lucide-react';
import { SystemNotification } from '@/lib/admin-types';

interface NotificationsViewProps {
  notifications: SystemNotification[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
}

export function NotificationsView({
  notifications,
  onMarkAsRead,
  onClearAll
}: NotificationsViewProps) {
  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-ujlog-secondary uppercase tracking-wider mb-1">
            <Bell className="w-4 h-4" />
            <span>Centre d&apos;Alerte & Surveillance</span>
          </div>
          <h1 className="font-display text-xl font-bold text-ujlog-ink tracking-tight">
            Notifications système
          </h1>
          <p className="text-xs text-ujlog-ink-soft/60">
            Alertes relatives aux créations de comptes, activations de délégués et modérations.
          </p>
        </div>

        <button
          type="button"
          onClick={onClearAll}
          className="px-3.5 py-2 bg-ujlog-cream hover:bg-ujlog-primary-light text-ujlog-ink-soft font-bold text-xs rounded-xl transition-all cursor-pointer"
        >
          Tout marquer comme lu
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white border border-ujlog-border rounded-3xl p-5 shadow-soft-warm space-y-3">
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-xs text-ujlog-ink-soft space-y-2">
            <Bell className="w-8 h-8 text-ujlog-ink-soft mx-auto" />
            <p className="font-bold text-ujlog-ink-soft/60">Aucune notification système</p>
          </div>
        ) : (
          notifications.map((n) => {
            let Icon = Info;
            let iconColor = 'text-ujlog-primary bg-ujlog-primary-light border-ujlog-primary/20';

            if (n.type === 'publication_error' || (n.type as string) === 'error') {
              Icon = AlertTriangle;
              iconColor = 'text-rose-400 bg-rose-950 border-rose-800';
            } else if (n.type === 'delegate' || n.type === 'delegate_revoked') {
              Icon = UserCheck;
              iconColor = 'text-ujlog-secondary bg-ujlog-secondary-50 border-ujlog-secondary-100';
            } else if (n.type === 'course_published' || n.type === 'course_deleted') {
              Icon = BookOpen;
              iconColor = 'text-ujlog-primary bg-ujlog-primary-light border-ujlog-primary/20';
            }

            return (
              <div
                key={n.id}
                onClick={() => onMarkAsRead(n.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 text-xs ${
                  n.read
                    ? 'bg-ujlog-cream/40 border-ujlog-border/60 opacity-70'
                    : 'bg-ujlog-cream border-ujlog-border font-medium'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl border ${iconColor} shrink-0 mt-0.5`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-bold text-ujlog-ink text-xs">{n.title}</p>
                    <p className="text-ujlog-ink-soft">{n.message}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 text-right">
                  <span className="text-[10px] font-mono text-ujlog-ink-soft flex items-center gap-1">
                    <Clock className="w-3 h-3 text-ujlog-ink-soft" />
                    {new Date(n.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {!n.read && (
                    <span className="mt-1 px-2 py-0.5 bg-green-500/20 text-ujlog-secondary text-[9px] font-bold rounded-full">
                      Non lu
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
