'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { LEVEL_CODE_TO_LABEL, FIELD_CODE_TO_LABEL } from '@/lib/academic-reference';
import { ContactModal } from './contact-modal';
import { 
  Home, 
  BookOpen, 
  Bookmark, 
  User, 
  Bell, 
  LogOut,
  Sparkles,
  ShieldCheck,
  KeyRound,
  Headphones,
  ChevronDown,
  Archive
} from 'lucide-react';

export function DashboardNavigation() {
  const pathname = usePathname();
  const { user, logout } = useUser();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isGestionOpen, setIsGestionOpen] = useState(false);

  const isDelegate = Boolean(user?.isDelegate || user?.role === 'delegate');

  const navItems = [
    { label: 'Accueil', href: '/dashboard', icon: Home },
    { label: 'Mes Cours', href: '/dashboard/cours', icon: BookOpen },
    { label: 'Sauvegardes', href: '/dashboard/sauvegardes', icon: Bookmark },
    { label: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    { label: 'Mon Profil', href: '/dashboard/profil', icon: User },
    { label: 'Gestion', href: '/dashboard/delegue', icon: ShieldCheck },
  ];

  return (
    <>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />

      {/* Desktop & Tablet Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-ujlog-border min-h-screen p-4 justify-between shrink-0 sticky top-0 h-screen">
        
        {/* Top Section */}
        <div className="space-y-4">
          
          {/* Brand Header */}
          <Link href="/dashboard" className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-ujlog-cream transition-colors">
            <div className="flex items-center gap-1.5 p-1 bg-ujlog-cream rounded-xl border border-ujlog-border shrink-0">
              <div className="relative w-6 h-6 bg-white rounded-md p-0.5 shadow-2xs">
                <Image 
                  src="/logo-ujlog.png" 
                  alt="Logo UJLOG" 
                  fill
                  className="object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="relative w-6 h-6 bg-white rounded-md p-0.5 shadow-2xs">
                <Image 
                  src="/logo-geographie.jpg" 
                  alt="Logo Département Géographie" 
                  fill
                  className="object-contain rounded-sm"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-xs tracking-tight text-ujlog-primary-dark uppercase truncate">
                UJLOG ÉTUDIANT
              </span>
              <span className="text-[9px] font-bold text-green-700 uppercase tracking-wider truncate">
                Dép. Géographie
              </span>
            </div>
          </Link>

          {/* User Micro Profile Card */}
          <div className="bg-ujlog-cream rounded-2xl p-3 border border-ujlog-border flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-xl bg-terracotta-gradient text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-glow-orange overflow-hidden">
              {user.avatarUrl ? (
                <Image src={user.avatarUrl} alt="Avatar" fill className="object-cover" />
              ) : (
                <span>{(user.firstName?.[0] || 'E') + (user.lastName?.[0] || '')}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-ujlog-ink truncate">
                  {user.lastName ? `${user.firstName} ${user.lastName}` : 'Étudiant UJLOG'}
                </p>
                {isDelegate && (
                  <span className="shrink-0 w-2 h-2 rounded-full bg-ujlog-primary ring-2 ring-ujlog-primary-100" title="Rôle Délégué actif" />
                )}
              </div>
              <p className="text-[10px] font-semibold text-ujlog-secondary truncate">
                {(user.level && LEVEL_CODE_TO_LABEL[user.level]) || 'Étudiant'} • {(user.field && FIELD_CODE_TO_LABEL[user.field]) || 'Tronc commun'}
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold text-xs transition-all ${
                    isActive
                      ? 'bg-terracotta-gradient text-white shadow-glow-orange font-bold'
                      : 'text-ujlog-ink-soft hover:text-ujlog-ink hover:bg-ujlog-cream'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-ujlog-ink-soft/60'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                </Link>
              );
            })}

            {/* Gestion Dropdown Menu */}
            <div className="pt-2 border-t border-ujlog-border mt-2 space-y-1">
              <button
                type="button"
                onClick={() => setIsGestionOpen(!isGestionOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-ujlog-ink-soft hover:bg-ujlog-cream transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-ujlog-primary-dark" />
                  <span>Gestion / Accès</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-ujlog-ink-soft/60 transition-transform ${isGestionOpen ? 'rotate-180' : ''}`} />
              </button>

              {(isGestionOpen || pathname?.startsWith('/dashboard/delegue') || pathname?.startsWith('/super-admin')) && (
                <div className="pl-3 space-y-1 border-l-2 border-ujlog-border ml-3 pt-1">
                  <Link
                    href="/dashboard/delegue"
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      pathname?.startsWith('/dashboard/delegue')
                        ? 'bg-ujlog-primary-100 text-ujlog-primary-dark'
                        : 'text-ujlog-ink-soft hover:text-ujlog-primary-dark hover:bg-orange-50'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-orange-700" />
                    <span>Délégué</span>
                  </Link>

                  <Link
                    href="/super-admin/login"
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      pathname?.startsWith('/super-admin')
                        ? 'bg-ujlog-secondary-100 text-ujlog-secondary'
                        : 'text-ujlog-ink-soft hover:text-green-900 hover:bg-green-50'
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5 text-green-600" />
                    <span>Super Admin</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setIsContactModalOpen(true)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-ujlog-ink-soft hover:text-ujlog-primary-dark hover:bg-orange-50 transition-all cursor-pointer"
                  >
                    <Headphones className="w-3.5 h-3.5 text-ujlog-primary-dark" />
                    <span>Contacter le support</span>
                  </button>
                </div>
              )}
            </div>

            {/* Contacter le service client & Archives Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={() => setIsContactModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-2.5 py-2.5 bg-orange-50 hover:bg-orange-100/80 text-ujlog-primary-dark font-bold text-[11px] rounded-xl border border-orange-200/80 transition-all cursor-pointer shadow-2xs"
                title="Contacter le service client"
              >
                <Headphones className="w-3.5 h-3.5 text-ujlog-primary-dark shrink-0" />
                <span>Support</span>
              </button>

              <Link
                href="/dashboard/archives"
                className="flex items-center justify-center gap-1.5 px-2.5 py-2.5 bg-green-50 hover:bg-ujlog-secondary-100 text-ujlog-secondary font-bold text-[11px] rounded-xl border border-green-200/80 transition-all cursor-pointer shadow-2xs"
                title="Consulter les archives académiques"
              >
                <Archive className="w-3.5 h-3.5 text-green-800 shrink-0" />
                <span>Archives</span>
              </Link>
            </div>
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="pt-3 border-t border-ujlog-border space-y-2">
          <div className="px-2.5 py-2 bg-ujlog-secondary-50 rounded-xl border border-ujlog-secondary-100">
            <p className="text-[9px] font-bold uppercase tracking-wider text-ujlog-secondary flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-ujlog-secondary" />
              <span>Année Universitaire</span>
            </p>
            <p className="text-[11px] font-bold text-ujlog-ink mt-0.5">
              {user.academicYear || '2026-2027'}
            </p>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Déconnexion</span>
          </button>
        </div>

      </aside>

      {/* Mobile & Tablet Top App Bar */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-ujlog-border px-3.5 sm:px-4 py-2.5 flex items-center justify-between shadow-2xs">
        <Link href="/dashboard" className="flex items-center gap-2 min-h-[44px]">
          <div className="flex items-center gap-1 p-1 bg-ujlog-cream rounded-xl border border-ujlog-border shrink-0">
            <div className="relative w-5 h-5 bg-white rounded p-0.5 shadow-2xs">
              <Image src="/logo-ujlog.png" alt="Logo" fill className="object-contain" referrerPolicy="no-referrer" />
            </div>
            <div className="relative w-5 h-5 bg-white rounded p-0.5 shadow-2xs">
              <Image src="/logo-geographie.jpg" alt="Logo Géo" fill className="object-contain rounded-xs" referrerPolicy="no-referrer" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xs text-ujlog-primary-dark uppercase tracking-tight leading-tight">UJLOG ÉTUDIANT</span>
            <span className="text-[9px] font-bold text-green-700 uppercase tracking-wider leading-none">Dép. Géographie</span>
          </div>
        </Link>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsContactModalOpen(true)}
            className="p-2 bg-orange-50 text-ujlog-primary-dark rounded-xl border border-orange-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
            title="Contacter le service client"
          >
            <Headphones className="w-4 h-4" />
          </button>

          <Link
            href="/dashboard/archives"
            className="p-2 bg-green-50 text-green-900 rounded-xl border border-green-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
            title="Espace Archives"
          >
            <Archive className="w-4 h-4 text-green-800" />
          </Link>

          <Link 
            href="/dashboard/profil" 
            className="flex items-center gap-1.5 p-1 sm:px-2 rounded-xl bg-ujlog-cream hover:bg-orange-50 transition-colors min-h-[38px]"
          >
            <div className="relative w-6 h-6 rounded-lg bg-orange-100 text-ujlog-primary-dark flex items-center justify-center font-bold text-[10px] overflow-hidden shrink-0">
              {user.avatarUrl ? (
                <Image src={user.avatarUrl} alt="Avatar" fill className="object-cover" />
              ) : (
                <span>{(user.firstName?.[0] || 'E')}</span>
              )}
            </div>
          </Link>
          <button 
            onClick={logout}
            className="w-9 h-9 flex items-center justify-center text-ujlog-ink-soft/60 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
            aria-label="Déconnexion"
            title="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile & Tablet Bottom Navigation Bar (PWA optimized, floating pill style) */}
      <nav className="lg:hidden fixed bottom-2 left-2 right-2 z-50 bg-white/95 backdrop-blur-md border border-ujlog-border rounded-3xl px-1 py-1.5 pb-[calc(0.4rem+env(safe-area-inset-bottom))] flex items-center justify-around shadow-soft-warm">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center min-w-[48px] min-h-[44px] py-1 px-1 rounded-2xl transition-all ${
                isActive 
                  ? 'text-ujlog-primary-dark font-bold' 
                  : 'text-ujlog-ink-soft/60 hover:text-ujlog-ink-soft'
              }`}
            >
              <div className={`flex items-center justify-center w-7 h-7 rounded-xl transition-all ${isActive ? 'bg-terracotta-gradient shadow-glow-orange' : ''}`}>
                <Icon className={`w-4 h-4 ${isActive ? 'text-white stroke-[2.5]' : 'text-ujlog-ink-soft/50'}`} />
              </div>
              <span className="text-[8.5px] mt-0.5 tracking-tight truncate max-w-[56px]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
