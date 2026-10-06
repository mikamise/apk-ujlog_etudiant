"use client";

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, BookOpen, Download, GraduationCap, Smartphone } from 'lucide-react';

const slides = [
  {
    key: 'welcome',
    icon: GraduationCap,
    eyebrow: 'Bienvenue sur UJLOG-etudiant',
    title: 'Votre espace académique, enfin simple.',
    subtitle: 'Retrouvez vos cours, TD, annales et ressources du Département de Géographie depuis un seul endroit.',
  },
  {
    key: 'courses',
    icon: BookOpen,
    eyebrow: 'Cours & ressources',
    title: 'Tout votre contenu au même endroit.',
    subtitle: 'Parcourez les niveaux, semestres et matières, puis ouvrez directement la ressource dont vous avez besoin.',
  },
  {
    key: 'offline',
    icon: Download,
    eyebrow: 'Hors connexion',
    title: 'Téléchargez avant de partir.',
    subtitle: 'Enregistrez vos documents importants et consultez-les ensuite même lorsque le réseau n’est plus disponible.',
  },
  {
    key: 'install',
    icon: Smartphone,
    eyebrow: 'Comme une vraie application',
    title: 'UJLOG est maintenant installé comme une application.',
    subtitle: 'L’installation ouvre directement cet écran la première fois. Après l’onboarding, vous accéderez à votre espace de connexion.',
  },
];

const ONBOARDING_KEY = 'ujlog_onboarding_done';

// Pas besoin de s'abonner : la valeur ne change pas depuis un autre onglet.
const subscribe = () => () => {};

const getSnapshot = () => {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  } catch {
    // Storage can be unavailable in private/restricted browsing contexts.
    return false;
  }
};

// `null` = "on ne sait pas encore" (SSR / première hydratation).
const getServerSnapshot = (): boolean | null => null;

function Splash() {
  return (
    <main
      className="min-h-[100dvh] bg-white flex items-center justify-center"
      aria-label="Ouverture de UJLOG"
      role="status"
    >
      <div className="h-12 w-12 rounded-2xl border border-ujlog-border bg-white p-2 shadow-soft-warm">
        <Image
          src="/icon-192.png"
          alt="UJLOG"
          width={32}
          height={32}
          className="h-full w-full object-contain"
          priority
        />
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const onboardingDone = useSyncExternalStore<boolean | null>(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  useEffect(() => {
    if (onboardingDone === true) {
      router.replace('/login');
    }
  }, [onboardingDone, router]);

  // Tant qu'on ne sait pas (SSR) ou si l'onboarding est déjà fait → splash.
  if (onboardingDone === null || onboardingDone === true) {
    return <Splash />;
  }

  const slide = slides[step];
  const isLast = step === slides.length - 1;
  const Icon = slide.icon;

  const complete = () => {
    try {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // Storage can be unavailable in private/restricted browsing contexts.
    }
    router.replace('/login');
  };

  return (
    <main className="min-h-[100dvh] bg-white text-ujlog-ink flex flex-col">
      <header className="flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8 sm:pt-8">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl border border-ujlog-border bg-white p-1.5 shadow-soft-warm">
            <Image
              src="/icon-192.png"
              alt="UJLOG"
              width={24}
              height={24}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <span className="text-sm font-bold tracking-tight">UJLOG</span>
        </div>
        <button
          type="button"
          onClick={complete}
          className="text-sm font-semibold text-ujlog-ink-soft hover:text-ujlog-ink"
        >
          Passer
        </button>
      </header>

      <section className="flex-1 flex items-center justify-center px-6 py-10 sm:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.24 }}
            className="w-full max-w-md text-center"
          >
            <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[28px] border border-orange-100 bg-orange-50 text-ujlog-primary shadow-soft-warm">
              <Icon className="h-10 w-10" strokeWidth={1.8} />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ujlog-primary">
              {slide.eyebrow}
            </p>
            <h1 className="mt-3 text-[clamp(1.8rem,7vw,2.7rem)] font-extrabold tracking-[-0.035em] leading-[1.08]">
              {slide.title}
            </h1>
            <p className="mx-auto mt-5 max-w-sm text-sm leading-6 text-ujlog-ink-soft sm:text-base">
              {slide.subtitle}
            </p>
          </motion.div>
        </AnimatePresence>
      </section>

      <footer className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8 sm:pb-8">
        <div className="mx-auto max-w-md">
          <div
            className="mb-6 flex justify-center gap-1.5"
            aria-label={`Étape ${step + 1} sur ${slides.length}`}
          >
            {slides.map((item, index) => (
              <span
                key={item.key}
                className={`h-1.5 rounded-full transition-all ${
                  index === step ? 'w-8 bg-ujlog-primary' : 'w-1.5 bg-ujlog-border'
                }`}
              />
            ))}
          </div>
          <div className="flex gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((value) => value - 1)}
                className="h-12 rounded-2xl border border-ujlog-border px-5 text-sm font-bold text-ujlog-ink hover:bg-ujlog-cream"
              >
                Retour
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? complete() : setStep((value) => value + 1))}
              className="h-12 flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-ujlog-primary px-5 text-sm font-bold text-white shadow-soft-warm hover:bg-ujlog-primary-dark active:scale-[0.99]"
            >
              {isLast ? 'Accéder à UJLOG' : 'Continuer'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </footer>
    </main>
  );
}
