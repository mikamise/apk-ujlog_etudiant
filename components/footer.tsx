import Image from 'next/image';
import Link from 'next/link';
import { Mail, MessageCircle, MapPin, Sparkles, Phone, ShieldCheck, Landmark, BookOpen, Smartphone } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-ujlog-primary-deep text-white pt-14 pb-10 border-t border-orange-900/60 relative overflow-hidden">
      {/* Decorative gradient blur */}
      <div className="absolute top-0 right-10 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-green-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

        {/* Main 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10">

          {/* Column 1: Identity & Department (5 Cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Dual Logos Container */}
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl w-fit border border-white/15 shadow-md">
              <div className="relative w-10 h-10 bg-white rounded-xl p-1 flex items-center justify-center">
                <Image
                  src="/logo-ujlog.png"
                  alt="Logo UJLOG"
                  fill
                  className="object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="h-6 w-px bg-white/20"></div>
              <div className="relative w-10 h-10 bg-white rounded-xl p-1 flex items-center justify-center">
                <Image
                  src="/logo-geographie.jpg"
                  alt="Logo Département Géographie"
                  fill
                  className="object-contain rounded-lg"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/20 border border-green-400/30 text-[10px] font-black text-white uppercase tracking-widest">
                <Sparkles className="w-3 h-3 text-white" />
                <span>Portail Pédagogique Officiel</span>
              </div>
              <h3 className="text-lg font-black text-white tracking-tight uppercase">
                Département de Géographie
              </h3>
              <p className="text-xs font-semibold text-orange-300">
                UFR Sciences Sociales • Université Jean Lorougnon Guédé
              </p>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed max-w-md font-normal">
              Plateforme académique dédiée à la centralisation et au partage des supports de cours magistraux, travaux dirigés, cartographies et annales d&apos;examens.
            </p>

            <div className="flex items-center gap-2 text-[11px] text-orange-200/90 font-medium">
              <MapPin className="w-4 h-4 text-white shrink-0" />
              <span>BP 150 Daloa, Côte d&apos;Ivoire</span>
            </div>
          </div>

          {/* Column 2: Parcours LMD (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Cycles LMD</span>
            </h4>
            <ul className="space-y-2.5 text-xs text-stone-300">
              <li>
                <Link href="/register?level=L1" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                  <span>Licence 1 (L1)</span>
                </Link>
              </li>
              <li>
                <Link href="/register?level=L2" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                  <span>Licence 2 (L2)</span>
                </Link>
              </li>
              <li>
                <Link href="/register?level=L3" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                  <span>Licence 3 (L3)</span>
                </Link>
              </li>
              <li>
                <Link href="/register?level=M1" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                  <span>Master 1 (M1)</span>
                </Link>
              </li>
              <li>
                <Link href="/register?level=M2" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                  <span>Master 2 (M2)</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Navigation & Services (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5" />
              <span>Accès Rapides</span>
            </h4>
            <ul className="space-y-2.5 text-xs text-stone-300">
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Connexion étudiant
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white transition-colors">
                  Création de compte
                </Link>
              </li>
              <li>
                <Link href="#telecharger-apk" className="hover:text-white transition-colors flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-orange-400" />
                  <span>App Mobile (.APK / iOS)</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Assistance Directe (3 Cols) */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Assistance & Contact</span>
            </h4>

            <div className="space-y-3">
              {/* WhatsApp Button */}
              <a
                href="https://wa.me/2250594408458"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-orange-900/70 hover:bg-orange-800/90 text-white border border-orange-600/50 rounded-2xl text-xs font-bold transition-all shadow-md group active:scale-95"
              >
                <div className="p-2 bg-orange-600 rounded-xl text-white group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-white">WhatsApp Assistance</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span>
                  </div>
                  <span className="text-[10px] text-orange-200/90 font-mono">+225 05 94 40 84 58</span>
                </div>
              </a>

              {/* Email Assistance */}
              <a
                href="mailto:geo.ci"
                className="flex items-center gap-3 p-3 bg-stone-900/80 hover:bg-stone-800 text-white border border-stone-700/60 rounded-2xl text-xs font-bold transition-all shadow-md group active:scale-95"
              >
                <div className="p-2 bg-green-500 rounded-xl text-stone-950 group-hover:scale-110 transition-transform">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-white">E-mail Support</span>
                  <span className="text-[10px] text-white truncate max-w-[180px]">
                    étudiantgeo9@gmail.com
                  </span>
                </div>
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Bar with Copyright */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ujlog-ink-soft/60">
          <p className="font-semibold text-center sm:text-left text-stone-300">
            © 2026 Département de Géographie. Tous droits réservés.
          </p>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-orange-400 font-bold">Session 2026-2027</span>
            <span className="text-ujlog-ink-soft">•</span>
            <span className="text-ujlog-ink-soft/60">Daloa, Côte d&apos;Ivoire</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
