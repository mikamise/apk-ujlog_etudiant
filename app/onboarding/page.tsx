'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { FolderOpen, ShieldCheck, ArrowRight } from 'lucide-react';

const slides = [
  {
    key: 'intro',
    kind: 'brand' as const,
    title: 'UJLOG • GÉOGRAPHIE',
    subtitle: 'Portail académique officiel du Département de Géographie de l\'Université Jean Lorougnon Guédé de Daloa',
  },
  {
    key: 'store',
    kind: 'illustration' as const,
    icon: FolderOpen,
    accent: 'orange' as const,
    title: (
      <>Accédez à tous <span className="text-ujlog-primary">vos cours & TD</span></>
    ),
    subtitle: 'Consultez et téléchargez les supports de cours magistraux, fiches de TD, cartes et annales du L1 au M2.',
  },
  {
    key: 'secure',
    kind: 'illustration' as const,
    icon: ShieldCheck,
    accent: 'green' as const,
    title: (
      <>Résultats & PV <span className="text-ujlog-secondary">officiels vérifiés</span></>
    ),
    subtitle: 'Consultez les procès-verbaux d\'examens et résultats de TD certifiés par vos délégués et l\'administration.',
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

  return (
    <div className="min-h-screen bg-ujlog-cream flex flex-col relative overflow-hidden">
      {/* Subtle topographic motif */}
      <svg className="absolute -top-16 -right-16 w-72 h-72 opacity-[0.06] pointer-events-none" viewBox="0 0 480 480" fill="none">
        <circle cx="300" cy="120" r="70" stroke="#ff7a00" strokeWidth="1.5" />
        <circle cx="300" cy="120" r="105" stroke="#ff7a00" strokeWidth="1.5" />
        <circle cx="300" cy="120" r="140" stroke="#ff7a00" strokeWidth="1.5" />
      </svg>

      {/* Skip link */}
      <div className="relative z-10 flex justify-end p-4 sm:p-6">
        <button
          type="button"
          onClick={completeOnboarding}
          className="text-xs font-bold text-ujlog-ink-soft hover:text-ujlog-ink transition-colors cursor-pointer"
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
            className="w-full max-w-sm flex flex-col items-center text-center space-y-6"
          >
            {slide.kind === 'brand' ? (
              <>
                <div className="flex items-center justify-center gap-3 p-3 bg-white rounded-3xl shadow-card-hover border border-ujlog-border">
                  <div className="relative w-20 h-20 bg-orange-50/50 rounded-2xl p-2 border border-orange-100 flex items-center justify-center">
                    <div className="relative w-full h-full">
                      <Image src="/logo-ujlog.png" alt="Logo UJLOG" fill className="object-contain" referrerPolicy="no-referrer" priority />
                    </div>
                  </div>
                  <div className="h-10 w-px bg-ujlog-border" />
                  <div className="relative w-20 h-20 bg-green-50/50 rounded-2xl p-2 border border-green-100 flex items-center justify-center">
                    <div className="relative w-full h-full">
                      <Image src="/logo-geographie.png" alt="Logo Département de Géographie" fill className="object-contain" referrerPolicy="no-referrer" priority />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="inline-block px-3 py-1 bg-orange-100 text-ujlog-primary-dark font-black text-[10px] uppercase tracking-wider rounded-full">
                    Daloa • Côte d&apos;Ivoire
                  </span>
                  <h1 className="font-display text-2xl font-bold text-ujlog-ink tracking-tight">
                    {slide.title}
                  </h1>
                  <p className="text-xs text-ujlog-ink-soft leading-relaxed max-w-xs mx-auto">
                    {slide.subtitle}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div
                  className={`w-40 h-40 rounded-[36px] flex items-center justify-center ${
                    slide.accent === 'orange'
                      ? 'bg-terracotta-gradient shadow-glow-orange'
                      : 'bg-green-gradient shadow-glow-green'
                  }`}
                >
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
                i === step ? 'w-6 bg-ujlog-primary' : 'w-1.5 bg-ujlog-border'
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
                : 'bg-white border border-ujlog-border text-ujlog-ink-soft hover:text-ujlog-ink cursor-pointer'
            }`}
          >
            Précédent
          </button>

          <button
            type="button"
            onClick={goNext}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-terracotta-gradient text-white py-3 rounded-2xl font-bold text-sm shadow-glow-orange hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer"
          >
            <span>{isLast ? 'Commencer' : 'Suivant'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}
