'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, BookOpen, ShieldCheck, Sparkles, Smartphone, CheckCircle2, Award, Landmark, MapPin } from 'lucide-react';

export function Hero() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } }
  };

  // Floating animation variants for institutional cards
  const floating1 = {
    animate: {
      y: [0, -6, 0],
      transition: {
        duration: 4.5,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    }
  };

  const floating2 = {
    animate: {
      y: [0, 6, 0],
      transition: {
        duration: 5,
        repeat: Infinity,
        ease: "easeInOut" as const,
        delay: 0.8
      }
    }
  };

  const floating3 = {
    animate: {
      y: [0, -4, 0],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut" as const,
        delay: 1.5
      }
    }
  };

  return (
    <section className="relative w-full pt-10 pb-16 sm:py-20 overflow-hidden bg-terracotta-gradient">
      {/* Topographic contour motif (signature Geography touch) */}
      <svg className="absolute -top-24 -right-32 w-[560px] h-[560px] opacity-40 pointer-events-none" viewBox="0 0 480 480" fill="none">
        <circle cx="300" cy="150" r="90" stroke="rgba(255,247,237,0.3)" strokeWidth="1.5" />
        <circle cx="300" cy="150" r="140" stroke="rgba(255,247,237,0.22)" strokeWidth="1.5" />
        <circle cx="300" cy="150" r="190" stroke="rgba(255,247,237,0.15)" strokeWidth="1.5" />
        <circle cx="300" cy="150" r="240" stroke="rgba(255,247,237,0.1)" strokeWidth="1.5" />
      </svg>
      {/* Background Decorative Blur Orbs */}
      <div className="absolute top-10 right-1/4 w-96 h-96 bg-green-300/25 rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-orange-100/15 rounded-full blur-3xl pointer-events-none -z-0" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        
        {/* Left Column: Heading, Context & CTAs */}
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="col-span-1 lg:col-span-7 flex flex-col justify-center text-left space-y-5"
        >
          {/* Institution Badge */}
          <motion.div variants={item} className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-full w-fit border border-white/25 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-green-300 animate-ping"></span>
            <span className="text-[10px] sm:text-[11px] font-black text-orange-50 uppercase tracking-widest flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-orange-100" />
              <span>Université Jean Lorougnon Guédé • Daloa</span>
            </span>
          </motion.div>

          {/* Main Title */}
          <motion.h1 variants={item} className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-orange-50 leading-tight tracking-tight">
            Espace Pédagogique du <br />
            <span className="text-green-200">
              Département de Géographie
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p variants={item} className="text-xs sm:text-sm text-orange-50/85 leading-relaxed max-w-xl font-normal">
            Accédez en temps réel à l&apos;ensemble de vos cours magistraux (CM), travaux dirigés (TD), annales d&apos;examens et communications officielles de la Licence 1 au Master 2.
          </motion.p>

          {/* Action CTAs */}
          <motion.div variants={item} className="flex flex-wrap items-center gap-3 pt-2">
            <Link 
              href="/register" 
              className="inline-flex items-center justify-center gap-2 bg-ujlog-primary hover:bg-ujlog-primary-dark text-white px-6 py-3 rounded-2xl font-black text-xs sm:text-sm shadow-md hover:shadow-lg transition-all active:scale-95 group"
            >
              <span>Créer mon compte étudiant</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link 
              href="/login" 
              className="inline-flex items-center justify-center bg-white/12 backdrop-blur-md border border-white/25 hover:bg-white/20 text-orange-50 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all"
            >
              Se connecter
            </Link>

            <Link 
              href="#telecharger-apk" 
              className="inline-flex items-center justify-center gap-1.5 bg-green-400/20 hover:bg-green-400/30 border border-green-300/40 text-green-100 px-4 py-3 rounded-2xl font-extrabold text-xs transition-all"
            >
              <Smartphone className="w-4 h-4 text-green-200" />
              <span>App Mobile (.APK / iOS)</span>
            </Link>
          </motion.div>

          {/* Badges / Guarantees */}
          <motion.div variants={item} className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px] font-medium">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20">
              <ShieldCheck className="w-4 h-4 text-orange-100 shrink-0" />
              <span className="font-bold text-orange-50">Accès sécurisé</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20">
              <BookOpen className="w-4 h-4 text-green-200 shrink-0" />
              <span className="font-bold text-orange-50">Licence 1 à Master 2</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20 col-span-2 sm:col-span-1">
              <Sparkles className="w-4 h-4 text-green-200 shrink-0" />
              <span className="font-bold text-orange-50">Session 2026-2027</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Right Column: Visual Composition with 3 Animated Institution Cards */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.2 }}
          className="col-span-1 lg:col-span-5 relative"
        >
          {/* Card Container with subtle backdrop & image preview */}
          <div className="relative bg-ujlog-primary-dark/90 backdrop-blur-xl rounded-3xl p-5 sm:p-7 shadow-glow-orange border border-white/15 overflow-hidden space-y-4">
            
            {/* Top Campus Visual Preview */}
            <div className="relative w-full h-48 sm:h-52 rounded-2xl overflow-hidden border border-white/30 shadow-lg group bg-stone-900">
              <Image
                src="/campus-geographie.jpg"
                alt="Campus Universitaire UJLOG Daloa - Bâtiments verts et toitures orange"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
                priority
              />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <span className="text-[10px] font-black text-white uppercase tracking-wider bg-stone-950/80 backdrop-blur-md px-3 py-1 rounded-lg border border-green-400/30 shadow-sm">
                  Campus Universitaire UJLOG Daloa
                </span>
                <span className="text-[10px] font-bold text-orange-200 bg-orange-950/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-orange-400/30 shadow-sm">
                  Côte d&apos;Ivoire
                </span>
              </div>
            </div>

            {/* THE 3 ANIMATED INSTITUTION CARDS */}
            <div className="space-y-3 pt-1">
              
              {/* CARD 1: Université Jean Lorougnon Guédé */}
              <motion.div 
                variants={floating1}
                animate="animate"
                whileHover={{ scale: 1.02 }}
                className="bg-white/10 hover:bg-white/15 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 shadow-lg flex items-center gap-3.5 transition-all cursor-default"
              >
                <div className="relative w-11 h-11 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-md p-1 border border-orange-200">
                  <div className="relative w-full h-full">
                    <Image 
                      src="/logo-ujlog.png" 
                      alt="Logo UJLOG" 
                      fill
                      className="object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  {/* Glowing Pulse Ring */}
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full ring-2 ring-white animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-white uppercase tracking-widest">
                      Institution Publique
                    </span>
                    <span className="text-[9px] text-orange-200 font-bold">UJLOG</span>
                  </div>
                  <p className="text-xs font-black text-white truncate">
                    Univ. Jean Lorougnon Guédé
                  </p>
                  <p className="text-[10px] text-orange-100/80 truncate">
                    Excellence & Innovation Pédagogique
                  </p>
                </div>
              </motion.div>

              {/* CARD 2: Département de Géographie */}
              <motion.div 
                variants={floating2}
                animate="animate"
                whileHover={{ scale: 1.02 }}
                className="bg-ujlog-primary backdrop-blur-md p-3.5 rounded-2xl border border-orange-400/40 shadow-xl flex items-center gap-3.5 transition-all cursor-default relative overflow-hidden"
              >
                {/* Shimmer Light Accent */}
                <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-green-400/10 to-transparent pointer-events-none" />
                
                <div className="relative w-11 h-11 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-md p-1 border border-green-300/80">
                  <div className="relative w-full h-full">
                    <Image 
                      src="/logo-geographie.jpg" 
                      alt="Logo Département Géographie" 
                      fill
                      className="object-contain rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full ring-2 ring-orange-900 animate-ping" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-orange-200 uppercase tracking-widest">
                      UFR Sciences Sociales
                    </span>
                    <span className="text-[9px] text-white font-black">GÉO</span>
                  </div>
                  <p className="text-xs font-black text-white truncate">
                    Département de Géographie
                  </p>
                  <p className="text-[10px] text-green-200/90 truncate">
                    Enseignement & Recherche Cartographique
                  </p>
                </div>
              </motion.div>

              {/* CARD 3: Espace Numérique & Session Active */}
              <motion.div 
                variants={floating3}
                animate="animate"
                whileHover={{ scale: 1.02 }}
                className="bg-stone-950/80 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-lg flex items-center justify-between text-left transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-ujlog-primary border border-ujlog-primary flex items-center justify-center text-white shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-white tracking-tight">
                      Session Académique 2026-2027
                    </p>
                    <p className="text-[10px] text-ujlog-ink-soft/60">
                      Ressources synchronisées en continu
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-ujlog-primary text-white text-[9px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span>
                  <span>En direct</span>
                </div>
              </motion.div>

            </div>

          </div>
        </motion.div>

      </div>
    </section>
  );
}
