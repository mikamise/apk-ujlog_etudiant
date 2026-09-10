'use client';

import Image from 'next/image';
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
  X
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
}

export function AdminSidebar({
  activeTab,
  onTabChange,
  onLogout,
  isOpenMobile,
  onCloseMobile
}: AdminSidebarProps) {
  const menuItems: Array<{ id: AdminTabType; label: string; icon: React.ElementType; badge?: string }> = [
    { id: 'overview', label: "Vue d'ensemble", icon: LayoutDashboard },
    { id: 'students', label: 'Étudiants', icon: Users },
    { id: 'delegates', label: 'Délégués', icon: UserCheck },
    { id: 'super_admins', label: 'Super Admins', icon: KeyRound },
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
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-ujlog-border shadow-2xs">
            <div className="relative w-6 h-6 bg-white rounded-md p-0.5">
              <Image src="/logo-ujlog.png" alt="Logo UJLOG" fill className="object-contain" referrerPolicy="no-referrer" />
            </div>
            <div className="relative w-6 h-6 bg-white rounded-md p-0.5">
              <Image src="/logo-geographie.jpg" alt="Logo Dép Géo" fill className="object-contain rounded-xs" referrerPolicy="no-referrer" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black text-ujlog-ink tracking-wider uppercase">
              CONSOLE UJLOG
            </span>
            <span className="text-[10px] font-bold text-green-700 uppercase tracking-tight">
              SUPER ADMIN
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
        {menuItems.map((item) => {
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
                    ? 'bg-green-gradient text-white shadow-glow-green'
                    : 'bg-terracotta-gradient text-white shadow-glow-orange'
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

      {/* Footer / Logout */}
      <div className="p-3 border-t border-ujlog-border bg-ujlog-cream/50">
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <LogOut className="w-4 h-4" />
            <span>Déconnexion</span>
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
