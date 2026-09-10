'use client';

import Image from 'next/image';
import { ShieldCheck, Bell, Menu, Activity, User, RefreshCw } from 'lucide-react';

interface AdminHeaderProps {
  onOpenMobileMenu: () => void;
  activeUsersCount: number;
  unreadNotifsCount: number;
  onOpenNotifications: () => void;
  onRefreshData: () => void;
  isRefreshing?: boolean;
  adminName?: string;
  adminEmail?: string;
}

export function AdminHeader({
  onOpenMobileMenu,
  activeUsersCount,
  unreadNotifsCount,
  onOpenNotifications,
  onRefreshData,
  isRefreshing,
  adminName = 'Super Administrateur',
  adminEmail = 'admin.super@ujlog.ci'
}: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-20 w-full bg-white/95 backdrop-blur-md border-b border-ujlog-border px-4 sm:px-6 h-16 flex items-center justify-between text-ujlog-ink shadow-2xs">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-ujlog-ink-soft hover:text-ujlog-ink rounded-xl hover:bg-ujlog-cream"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 p-1 bg-ujlog-cream rounded-xl border border-ujlog-border shadow-2xs">
            <div className="relative w-6 h-6 bg-white rounded-md p-0.5 shadow-2xs">
              <Image src="/logo-ujlog.png" alt="Logo UJLOG" fill className="object-contain" referrerPolicy="no-referrer" />
            </div>
            <div className="relative w-6 h-6 bg-white rounded-md p-0.5 shadow-2xs">
              <Image src="/logo-geographie.jpg" alt="Logo Département Géographie" fill className="object-contain rounded-xs" referrerPolicy="no-referrer" />
            </div>
          </div>
          <div>
            <h2 className="text-xs font-black text-ujlog-ink uppercase tracking-wider hidden sm:block">
              UNIVERSITÉ JEAN LOROUGNON GUÉDÉ
            </h2>
            <p className="text-[10px] text-green-700 font-bold uppercase tracking-tight">
              Espace de Contrôle Global • Dép. Géographie
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Refresh button */}
        <button
          type="button"
          onClick={onRefreshData}
          disabled={isRefreshing}
          title="Actualiser les données"
          className="p-2 text-ujlog-ink-soft hover:text-ujlog-ink rounded-xl hover:bg-ujlog-cream transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-orange-700' : ''}`} />
        </button>

        {/* Notifications Button */}
        <button
          type="button"
          onClick={onOpenNotifications}
          className="relative p-2 text-ujlog-ink-soft hover:text-ujlog-ink rounded-xl hover:bg-ujlog-cream transition-colors cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadNotifsCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-white" />
          )}
        </button>

        <div className="h-5 w-px bg-ujlog-border hidden sm:block" />

        {/* Admin Profile Pill */}
        <div className="flex items-center gap-2.5 bg-ujlog-cream border border-ujlog-border rounded-2xl p-1.5 pr-3">
          <div className="w-7 h-7 rounded-xl bg-terracotta-gradient flex items-center justify-center text-white font-bold text-xs shadow-glow-orange">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-bold text-ujlog-ink truncate max-w-[130px]">{adminName}</span>
            <span className="text-[9px] text-ujlog-ink-soft font-mono truncate max-w-[130px]">{adminEmail}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
