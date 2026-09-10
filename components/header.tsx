'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X, ArrowRight, Smartphone, Sparkles, LogIn, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${
      scrolled 
        ? 'bg-white/95 backdrop-blur-md border-b border-orange-950/10 shadow-sm py-2.5' 
        : 'bg-white/90 backdrop-blur-xs border-b border-ujlog-border py-3.5'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        
        {/* Logo and Identity */}
        <Link href="/" className="flex items-center gap-3 group">
          {/* Dual Institutional Logos */}
          <div className="flex items-center gap-2 p-1.5 bg-ujlog-cream group-hover:bg-orange-50/60 rounded-2xl border border-ujlog-border transition-colors">
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 bg-white rounded-lg p-0.5 shadow-2xs">
              <Image 
                src="/logo-ujlog.png" 
                alt="Logo UJLOG" 
                fill
                className="object-contain"
                referrerPolicy="no-referrer"
                priority
              />
            </div>
            <div className="h-5 w-px bg-ujlog-border"></div>
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 bg-white rounded-lg p-0.5 shadow-2xs">
              <Image 
                src="/logo-geographie.jpg" 
                alt="Logo Département Géographie" 
                fill
                className="object-contain rounded-md"
                referrerPolicy="no-referrer"
                priority
              />
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm sm:text-base leading-none text-ujlog-primary-dark tracking-tight">
                UJLOG ÉTUDIANT
              </span>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md bg-orange-100 text-ujlog-primary-dark text-[9px] font-extrabold uppercase">
                GÉO
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] text-green-700 font-bold uppercase tracking-wider mt-0.5">
              Département de Géographie • Daloa
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6">
          <Link 
            href="#presentation" 
            className="text-xs font-bold text-ujlog-ink-soft hover:text-ujlog-primary-dark transition-colors"
          >
            Présentation
          </Link>
          <Link 
            href="#parcours" 
            className="text-xs font-bold text-ujlog-ink-soft hover:text-ujlog-primary-dark transition-colors"
          >
            Parcours LMD
          </Link>
          <Link 
            href="#fonctionnalites" 
            className="text-xs font-bold text-ujlog-ink-soft hover:text-ujlog-primary-dark transition-colors"
          >
            Ressources
          </Link>
          <Link 
            href="#telecharger-apk" 
            className="inline-flex items-center gap-1 text-xs font-bold text-ujlog-primary-dark hover:text-ujlog-primary-dark bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200 transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5 text-orange-700" />
            <span>App Mobile (.APK)</span>
          </Link>
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden sm:flex items-center gap-2.5">
          <Link 
            href="/login" 
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-ujlog-ink-soft hover:text-ujlog-primary-dark hover:bg-ujlog-cream/80 rounded-xl transition-all"
          >
            <LogIn className="w-3.5 h-3.5 text-ujlog-ink-soft" />
            <span>Connexion</span>
          </Link>
          <Link 
            href="/register" 
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold text-white bg-ujlog-primary hover:bg-ujlog-primary-dark rounded-xl shadow-xs hover:shadow-md transition-all active:scale-95"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>S&apos;inscrire</span>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-xl bg-ujlog-cream hover:bg-ujlog-border text-ujlog-ink-soft transition-colors"
          aria-label="Menu de navigation"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-b border-ujlog-border px-4 pt-3 pb-6 space-y-3 shadow-lg"
          >
            <nav className="flex flex-col space-y-2 text-sm font-bold text-ujlog-ink-soft">
              <Link 
                href="#presentation" 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl hover:bg-orange-50 hover:text-ujlog-primary-dark transition-colors"
              >
                Présentation du Département
              </Link>
              <Link 
                href="#parcours" 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl hover:bg-orange-50 hover:text-ujlog-primary-dark transition-colors"
              >
                Parcours & Niveaux LMD
              </Link>
              <Link 
                href="#fonctionnalites" 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl hover:bg-orange-50 hover:text-ujlog-primary-dark transition-colors"
              >
                Ressources Pédagogiques
              </Link>
              <Link 
                href="#telecharger-apk" 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl bg-orange-50 text-ujlog-primary-dark flex items-center gap-2"
              >
                <Smartphone className="w-4 h-4 text-orange-700" />
                <span>Télécharger l&apos;App (.APK / iOS)</span>
              </Link>
            </nav>

            <div className="pt-3 border-t border-ujlog-border grid grid-cols-2 gap-2.5">
              <Link 
                href="/login" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 text-center text-xs font-bold text-ujlog-ink-soft bg-ujlog-cream hover:bg-ujlog-border rounded-xl"
              >
                Connexion
              </Link>
              <Link 
                href="/register" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 text-center text-xs font-bold text-white bg-orange-800 hover:bg-orange-700 rounded-xl shadow-xs"
              >
                S&apos;inscrire
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

