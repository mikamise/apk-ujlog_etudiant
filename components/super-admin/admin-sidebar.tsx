'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  BookOpen,
  GraduationCap,
  BarChart3,
  Bell,
  History,
  Settings,
  LogOut,
  ShieldCheck,
  KeyRound,
  Archive,
  X,
  ArrowLeft
} from 'lucide-react';

export type AdminTabType =
  | 'overview'
  | 'students'
  | 'delegates'
  | 'super_admins'
  | 'courses'
  | 'results'
  | 'archivage'
  | 'statistics'
  | 'notifications'
  | 'activity'
  | 'settings';

interface AdminSidebarProps {
  activeTab: AdminTabType;
  onTabChange: (tab: AdminTabType) => void;
  onLogout: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  currentUserRole?: 'admin' | 'super_admin';
}

export function AdminSidebar({
  activeTab,
  onTabChange,
  onLogout,
  isOpenMobile,
  onCloseMobile,
  currentUserRole = 'admin'
}: AdminSidebarProps) {
  const menuItems: Array<{ id: AdminTabType; label: string; icon: React.ElementType; badge?: string; superAdminOnly?: boolean }> = [
    { id: 'overview', label: "Vue d'ensemble", icon: LayoutDashboard },
    { id: 'students', label: 'Étudiants', icon: Users },
    { id: 'delegates', label: 'Délégués', icon: UserCheck },
    { id: 'super_admins', label: 'Super Admins', icon: KeyRound, superAdminOnly: true },
    { id: 'courses', label: 'Cours', icon: BookOpen },
    { id: 'results', label: 'Résultats', icon: GraduationCap },
    { id: 'archivage', label: 'Archivage & Années', icon: Archive },
    { id: 'statistics', label: 'Statistiques', icon: BarChart3 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'activity', label: 'Journal d’activité', icon: History },
    { id: 'settings', label: 'Paramètres', icon: Settings }
  ];

  const content = (
    <div className="flex flex-col h-full bg-white text-ujlog-ink border-r border-ujlog-border w-64 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-ujlog-border flex items-center justify-between bg-ujlog-cream/50">
        <div className="flex items-center gap-2.5">
          <div className="relative w-10 h-10 bg-white rounded-2xl p-1.5 border border-ujlog-border shadow-soft-warm shrink-0">
            <Image src="/logo-geographie.jpg" alt="Logo Département de Géographie" fill className="object-contain rounded-xl" referrerPolicy="no-referrer" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-sm font-bold text-ujlog-ink tracking-tight">
              Console UJLOG
            </span>
            <span className="text-[9px] font-bold text-green-700 uppercase tracking-wider">
              {currentUserRole === 'super_admin' ? 'Super administration' : 'Administration'}
            </span>
          </div>
        </div>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-ujlog-ink-soft/60 hover:text-ujlog-ink rounded-lg hover:bg-ujlog-cream"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold text-ujlog-ink-soft/60 uppercase tracking-wider">
          MENU ADMINISTRATION
        </div>
        {menuItems.filter((item) => !item.superAdminOnly || currentUserRole === 'super_admin').map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isSuperTab = item.id === 'super_admins';

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onTabChange(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? isSuperTab
                    ? 'bg-ujlog-secondary text-white shadow-sm'
                    : 'bg-ujlog-primary text-white shadow-sm'
                  : isSuperTab
                    ? 'text-green-800 bg-green-50/60 hover:bg-green-100/80 border border-green-200/60 font-extrabold'
                    : 'text-ujlog-ink-soft hover:text-ujlog-ink hover:bg-ujlog-cream'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : isSuperTab ? 'text-green-600' : 'text-ujlog-ink-soft/60'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Footer / navigation de sortie */}
      <div className="p-3 border-t border-ujlog-border bg-ujlog-cream/50 space-y-1.5">
        <Link
          href="/dashboard"
          onClick={() => onCloseMobile?.()}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-ujlog-ink-soft hover:text-ujlog-ink hover:bg-white border border-transparent hover:border-ujlog-border transition-all"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.8} />
          <span>Retour au dashboard</span>
        </Link>

        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <LogOut className="w-4 h-4" strokeWidth={1.8} />
            <span>Se déconnecter</span>
          </div>
          <span className="text-[10px] font-mono bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold">
            EXIT
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block h-screen sticky top-0 shrink-0 z-30">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs" onClick={onCloseMobile} />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
}
