'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Download, GraduationCap, ArrowRight } from 'lucide-react';

const slides = [
  {
    key: 'brand',
    kind: 'brand' as const,
  },
  {
    key: 'courses',
    kind: 'illustration' as const,
    icon: BookOpen,
    accent: 'orange' as const,
    title: (
      <>Tous vos <span className="text-ujlog-primary">cours &amp; TD</span> au même endroit</>
    ),
    subtitle: 'Cours magistraux, fiches de TD, cartes et annales du L1 au M2, classés par niveau et par semestre.',
  },
  {
    key: 'offline',
    kind: 'illustration' as const,
    icon: Download,
    accent: 'navy' as const,
    title: (
      <>Téléchargez, consultez <span className="text-ujlog-ink">hors ligne</span></>
    ),
    subtitle: 'Enregistrez vos documents une fois et retrouvez-les même sans connexion, où que vous soyez sur le campus.',
  },
  {
    key: 'results',
    kind: 'illustration' as const,
    icon: GraduationCap,
    accent: 'green' as const,
    title: (
      <>Résultats &amp; <span className="text-ujlog-secondary">contenu à jour</span></>
    ),
    subtitle: 'Consultez les résultats publiés par vos délégués et recevez le nouveau contenu dès sa mise en ligne.',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const isLast = step === slides.length - 1;
  const slide = slides[step];

  const completeOnboarding = () => {
    try {
      localStorage.setItem('ujlog_onboarding_done', 'true');
    } catch {
      // ignore
    }
    router.push('/login');
  };

  const goNext = () => {
    if (isLast) {
      completeOnboarding();
    } else {
      setStep((s) => s + 1);
    }
  };

  const goPrev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const accentClasses = {
    orange: 'bg-terracotta-gradient shadow-glow-orange',
    navy: 'bg-ujlog-ink shadow-lg',
    green: 'bg-green-gradient shadow-glow-green',
  };

  return (
    <div className={`min-h-screen flex flex-col relative overflow-hidden transition-colors ${slide.kind === 'brand' ? 'bg-ujlog-primary' : 'bg-white'}`}>

      {/* Skip link */}
      <div className="relative z-10 flex justify-end p-4 sm:p-6">
        <button
          type="button"
          onClick={completeOnboarding}
          className={`text-xs font-bold transition-colors cursor-pointer ${
            slide.kind === 'brand' ? 'text-white/80 hover:text-white' : 'text-ujlog-ink-soft hover:text-ujlog-ink'
          }`}
        >
          Passer
        </button>
      </div>

      {/* Slide content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.key}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-full max-w-sm flex flex-col items-center text-center space-y-7"
          >
            {slide.kind === 'brand' ? (
              <>
                {/* Logo du département en grand — élément dominant de la première slide */}
                <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-[40px] bg-white p-7 shadow-2xl">
                  <div className="relative w-full h-full">
                    <Image src="/logo-geographie.jpg" alt="Logo Département de Géographie" fill className="object-contain rounded-3xl" referrerPolicy="no-referrer" priority />
                  </div>
                </div>
                <div className="space-y-2.5">
                  <span className="inline-block px-3 py-1 bg-white/20 text-white font-black text-[10px] uppercase tracking-wider rounded-lg">
                    Daloa • Côte d&apos;Ivoire
                  </span>
                  <h1 className="font-display text-2xl font-bold text-white tracking-tight">
                    UJLOG • Géographie
                  </h1>
                  <p className="text-xs text-white/85 leading-relaxed max-w-xs mx-auto">
                    Portail académique du Département de Géographie de l&apos;Université Jean Lorougnon Guédé de Daloa.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className={`w-40 h-40 rounded-[36px] flex items-center justify-center ${accentClasses[slide.accent]}`}>
                  {slide.icon && <slide.icon className="w-16 h-16 text-white" strokeWidth={1.5} />}
                </div>
                <div className="space-y-2">
                  <h1 className="font-display text-xl font-bold text-ujlog-ink tracking-tight leading-snug">
                    {slide.title}
                  </h1>
                  <p className="text-xs text-ujlog-ink-soft leading-relaxed">
                    {slide.subtitle}
                  </p>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Progress dots + controls */}
      <footer className="relative z-10 px-6 pb-8 pt-2 space-y-5">
        <div className="flex items-center justify-center gap-1.5">
          {slides.map((s, i) => (
            <span
              key={s.key}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? slide.kind === 'brand' ? 'w-6 bg-white' : 'w-6 bg-ujlog-primary'
                  : slide.kind === 'brand' ? 'w-1.5 bg-white/30' : 'w-1.5 bg-ujlog-border'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 max-w-xs mx-auto w-full">
          <button
            type="button"
            onClick={goPrev}
            disabled={step === 0}
            className={`px-4 py-3 rounded-2xl font-bold text-xs transition-all ${
              step === 0
                ? 'opacity-0 pointer-events-none'
                : slide.kind === 'brand'
                ? 'bg-white/15 text-white hover:bg-white/25 cursor-pointer'
                : 'bg-ujlog-cream border border-ujlog-border text-ujlog-ink-soft hover:text-ujlog-ink cursor-pointer'
            }`}
          >
            Précédent
          </button>

          <button
            type="button"
            onClick={goNext}
            className={`flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm active:scale-[0.99] transition-all cursor-pointer ${
              slide.kind === 'brand'
                ? 'bg-white text-ujlog-primary-dark shadow-lg hover:brightness-105'
                : 'bg-terracotta-gradient text-white shadow-glow-orange hover:brightness-105'
            }`}
          >
            <span>{isLast ? 'Commencer' : 'Suivant'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}
