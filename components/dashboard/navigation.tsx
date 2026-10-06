'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { LEVEL_CODE_TO_LABEL, FIELD_CODE_TO_LABEL } from '@/lib/academic-reference';
import { ContactModal } from './contact-modal';
import {
  House,
  LibraryBig,
  Bookmark,
  UserRound,
  Bell,
  LogOut,
  Sparkles,
  ShieldCheck,
  KeyRound,
  LifeBuoy,
  ChevronDown,
  Archive,
  MoreHorizontal,
  X,
  FolderDown,
} from 'lucide-react';
import { CURRENT_ACADEMIC_YEAR_ID } from '@/lib/academic-year';

export function DashboardNavigation() {
  const pathname = usePathname();
  const { user, logout } = useUser();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isGestionOpen, setIsGestionOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const isDelegate = Boolean(user?.isDelegate || user?.role === 'delegate');
  const isAdmin = Boolean(user?.role === 'admin' || user?.role === 'super_admin');
  const canAccessDelegateSpace = isDelegate;
  const canAccessAdminSpace = isAdmin;

  // 4 raccourcis directs dans la barre — le reste (profil, gestion, archives,
  // support, déconnexion) est regroupé dans le tiroir "Plus" sur mobile.
  const navItems = [
    { label: 'Accueil', href: '/dashboard', icon: House },
    { label: 'Cours', href: '/dashboard/cours', icon: LibraryBig },
    { label: 'Sauvegardes', href: '/dashboard/sauvegardes', icon: Bookmark },
    { label: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  ];

  // La sidebar desktop garde tout visible directement (pas besoin du tiroir).
  const sidebarNavItems = [...navItems, { label: 'Mon Profil', href: '/dashboard/profil', icon: UserRound }];

  const moreItems = [
    { label: 'Mon Profil', href: '/dashboard/profil', icon: UserRound },
    { label: 'Téléchargements', href: '/dashboard/telechargements', icon: FolderDown },
    ...(canAccessDelegateSpace ? [{ label: 'Espace délégué', href: '/dashboard/delegue', icon: ShieldCheck }] : []),
    ...(canAccessAdminSpace ? [{ label: 'Administration', href: '/super-admin', icon: KeyRound }] : []),
    { label: 'Archives', href: '/dashboard/archives', icon: Archive },
    { label: 'Support', href: '#support', icon: LifeBuoy, action: () => setIsContactModalOpen(true) },
  ];

  const isMoreActive = moreItems.some((i) => i.href !== '#support' && pathname?.startsWith(i.href));

  return (
    <>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />

      {/* Desktop & Tablet Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-ujlog-border min-h-screen p-4 justify-between shrink-0 sticky top-0 h-screen">

        {/* Top Section */}
        <div className="space-y-4">

          {/* Brand Header — logo unique, mis en valeur */}
          <Link href="/dashboard" className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-ujlog-cream transition-colors">
            <div className="relative w-11 h-11 bg-white rounded-2xl p-1.5 shadow-soft-warm border border-ujlog-border shrink-0">
              <Image
                src="/logo-geographie.jpg"
                alt="Logo Département de Géographie"
                fill
                className="object-contain rounded-xl"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-display font-bold text-sm tracking-tight text-ujlog-ink truncate">
                UJLOG Étudiant
              </span>
              <span className="text-[9px] font-bold text-orange-700 uppercase tracking-wider truncate">
                Espace général
              </span>
            </div>
          </Link>

          {/* User Micro Profile Card */}
          <div className="bg-white rounded-2xl p-3 border border-ujlog-border flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-xl bg-stone-950 text-white flex items-center justify-center font-bold text-xs shrink-0  overflow-hidden">
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
                  <span className="shrink-0 w-2 h-2 rounded-full bg-stone-950 ring-2 ring-ujlog-primary-100" title="Rôle Délégué actif" />
                )}
              </div>
              <p className="text-[10px] font-semibold text-ujlog-secondary truncate">
                {(user.level && LEVEL_CODE_TO_LABEL[user.level]) || 'Étudiant'} • {(user.field && FIELD_CODE_TO_LABEL[user.field]) || 'Tronc commun'}
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {sidebarNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold text-xs transition-all ${
                    isActive
                      ? 'bg-stone-950 text-white font-bold'
                      : 'text-ujlog-ink-soft hover:text-ujlog-ink hover:bg-ujlog-cream'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${isActive ? 'bg-white/10' : 'bg-ujlog-cream/70 group-hover:bg-white'}`}><Icon className={`w-[18px] h-[18px] ${isActive ? 'text-white' : 'text-ujlog-ink-soft/65 group-hover:text-ujlog-ink'}`} strokeWidth={1.8} /></span>
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
                  <ShieldCheck className="w-[18px] h-[18px] text-orange-700" strokeWidth={1.8} />
                  <span>Gestion / Accès</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-ujlog-ink-soft/60 transition-transform ${isGestionOpen ? 'rotate-180' : ''}`} />
              </button>

              {(isGestionOpen || pathname?.startsWith('/dashboard/delegue') || pathname?.startsWith('/super-admin')) && (
                <div className="pl-3 space-y-1 border-l-2 border-ujlog-border ml-3 pt-1">
                  {canAccessDelegateSpace && (
                    <Link
                      href="/dashboard/delegue"
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        pathname?.startsWith('/dashboard/delegue')
                          ? 'bg-orange-50 text-orange-700'
                          : 'text-ujlog-ink-soft hover:text-orange-700 hover:bg-orange-50'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-orange-700" />
                      <span>Espace délégué</span>
                    </Link>
                  )}

                  {canAccessAdminSpace && (
                    <Link
                      href="/super-admin"
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        pathname?.startsWith('/super-admin')
                          ? 'bg-ujlog-secondary-100 text-ujlog-secondary'
                          : 'text-ujlog-ink-soft hover:text-green-900 hover:bg-green-50'
                      }`}
                    >
                      <KeyRound className="w-3.5 h-3.5 text-green-600" />
                      <span>Administration</span>
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsContactModalOpen(true)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-ujlog-ink-soft hover:text-orange-700 hover:bg-orange-50 transition-all cursor-pointer"
                  >
                    <LifeBuoy className="w-4 h-4 text-orange-700" strokeWidth={1.8} />
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
                className="flex items-center justify-center gap-1.5 px-2.5 py-2.5 bg-orange-50 hover:bg-orange-100/80 text-orange-700 font-bold text-[11px] rounded-xl border border-orange-200/80 transition-all cursor-pointer shadow-2xs"
                title="Contacter le service client"
              >
                <LifeBuoy className="w-4 h-4 text-orange-700 shrink-0" strokeWidth={1.8} />
                <span>Support</span>
              </button>

              <Link
                href="/dashboard/archives"
                className="flex items-center justify-center gap-1.5 px-2.5 py-2.5 bg-green-50 hover:bg-ujlog-secondary-100 text-ujlog-secondary font-bold text-[11px] rounded-xl border border-green-200/80 transition-all cursor-pointer shadow-2xs"
                title="Consulter les archives académiques"
              >
                <Archive className="w-4 h-4 text-green-800 shrink-0" strokeWidth={1.8} />
                <span>Archives</span>
              </Link>
            </div>
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="pt-3 border-t border-ujlog-border space-y-2">
          <div className="px-2.5 py-2 bg-ujlog-secondary-50 rounded-xl border border-ujlog-secondary-100">
            <p className="text-[9px] font-bold uppercase tracking-wider text-ujlog-secondary flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-ujlog-secondary" strokeWidth={1.8} />
              <span>Année Universitaire</span>
            </p>
            <p className="text-[11px] font-bold text-ujlog-ink mt-0.5">
              {user.academicYear || CURRENT_ACADEMIC_YEAR_ID}
            </p>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-[18px] h-[18px]" strokeWidth={1.8} />
            <span>Déconnexion</span>
          </button>
        </div>

      </aside>

      {/* Mobile & Tablet Top App Bar — logo unique et mis en valeur, plus d'icône profil/déconnexion ici */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-ujlog-border px-4 py-3 flex items-center justify-between shadow-2xs">
        <Link href="/dashboard" className="flex items-center gap-2.5 min-h-[44px]">
          <div className="relative w-10 h-10 bg-white rounded-2xl p-1.5 shadow-soft-warm border border-ujlog-border shrink-0">
            <Image src="/logo-geographie.jpg" alt="Logo Département de Géographie" fill className="object-contain rounded-xl" referrerPolicy="no-referrer" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-sm text-ujlog-ink tracking-tight leading-tight">UJLOG Étudiant</span>
            <span className="text-[9px] font-bold text-orange-700 uppercase tracking-wider leading-none">Espace général</span>
          </div>
        </Link>
      </header>

      {/* Mobile & Tablet Bottom Navigation — 4 raccourcis directs + tiroir "Plus" */}
      <nav className="lg:hidden fixed bottom-2 left-2 right-2 z-50">
        {isMoreOpen && (
          <div className="mb-2 bg-white border border-ujlog-border rounded-2xl shadow-soft-warm overflow-hidden">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href !== '#support' && pathname?.startsWith(item.href);
              const content = (
                <>
                  <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-orange-700' : 'text-ujlog-ink-soft/70'}`} strokeWidth={1.8} />
                  <span>{item.label}</span>
                </>
              );
              const className = `w-full flex items-center gap-3 px-4 py-3 text-xs font-bold border-b border-ujlog-border last:border-b-0 transition-colors ${
                isActive ? 'text-orange-700 bg-orange-50' : 'text-ujlog-ink hover:bg-ujlog-cream'
              }`;

              if (item.action) {
                return (
                  <button key={item.label} type="button" onClick={() => { item.action(); setIsMoreOpen(false); }} className={className}>
                    {content}
                  </button>
                );
              }
              return (
                <Link key={item.label} href={item.href} onClick={() => setIsMoreOpen(false)} className={className}>
                  {content}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => { logout(); setIsMoreOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-[18px] h-[18px]" strokeWidth={1.8} />
              <span>Déconnexion</span>
            </button>
          </div>
        )}

        <div className="bg-white/95 backdrop-blur-md border border-ujlog-border rounded-3xl px-1 py-1.5 pb-[calc(0.4rem+env(safe-area-inset-bottom))] flex items-center justify-around shadow-soft-warm">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center min-w-[48px] min-h-[44px] py-1 px-1 rounded-2xl transition-all ${
                  isActive
                    ? 'text-orange-700 font-bold'
                    : 'text-ujlog-ink-soft/60 hover:text-ujlog-ink-soft'
                }`}
              >
                <div className={`flex items-center justify-center w-7 h-7 rounded-xl transition-all ${isActive ? 'bg-stone-950 ' : ''}`}>
                  <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-white' : 'text-ujlog-ink-soft/50'}`} strokeWidth={1.8} />
                </div>
                <span className="text-[8.5px] mt-0.5 tracking-tight truncate max-w-[56px]">
                  {item.label}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setIsMoreOpen((v) => !v)}
            className={`flex flex-col items-center justify-center min-w-[48px] min-h-[44px] py-1 px-1 rounded-2xl transition-all cursor-pointer ${
              isMoreOpen || isMoreActive ? 'text-orange-700 font-bold' : 'text-ujlog-ink-soft/60 hover:text-ujlog-ink-soft'
            }`}
          >
            <div className={`flex items-center justify-center w-7 h-7 rounded-xl transition-all ${isMoreOpen || isMoreActive ? 'bg-stone-950 ' : ''}`}>
              {isMoreOpen ? (
                <X className={`w-4 h-4 ${isMoreOpen ? 'text-white' : ''}`} strokeWidth={1.8} />
              ) : (
                <MoreHorizontal className={`w-4 h-4 ${isMoreActive ? 'text-white' : 'text-ujlog-ink-soft/50'}`} strokeWidth={1.8} />
              )}
            </div>
            <span className="text-[8.5px] mt-0.5 tracking-tight">Plus</span>
          </button>
        </div>
      </nav>
    </>
  );
}
