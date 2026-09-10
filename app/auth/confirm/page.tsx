
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type ConfirmState = 'checking' | 'success' | 'invalid';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ujlog-cream flex flex-col">
      <header className="w-full bg-white border-b border-ujlog-border px-4 py-3 sm:px-8 sm:py-4 flex items-center justify-between">
        <Link href="/login" className="flex items-center gap-2 text-ujlog-ink-soft hover:text-ujlog-primary-dark transition-colors group">
          <div className="w-8 h-8 rounded-xl bg-ujlog-cream flex items-center justify-center group-hover:bg-ujlog-primary-light transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider hidden sm:block">Retour</span>
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="relative w-7 h-7 bg-white rounded-lg p-1 border border-ujlog-border">
            <Image src="/logo-ujlog.png" alt="Logo UJLOG" fill className="object-contain" referrerPolicy="no-referrer" />
          </div>
          <span className="font-display font-bold text-ujlog-ink tracking-tight text-sm">UJLOG ÉTUDIANT</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-soft-warm border border-ujlog-border p-6 sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function ConfirmAccountPage() {
  const router = useRouter();
  const [state, setState] = useState<ConfirmState>('checking');

  // Le lien reçu par e-mail (Supabase) établit une session côté navigateur
  // dès le chargement de cette page (le client Supabase détecte le token
  // dans l'URL automatiquement). Cette détection est asynchrone : on
  // réessaie donc plusieurs fois avant de conclure que le lien est invalide.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const check = async (attemptsLeft: number): Promise<void> => {
      const { data, error } = await supabase.auth.getUser();

      if (!cancelled && !error && data.user) {
        setState('success');
        setTimeout(() => {
          if (!cancelled) router.push('/dashboard');
        }, 1800);
        return;
      }

      if (cancelled) return;

      if (attemptsLeft > 0) {
        setTimeout(() => check(attemptsLeft - 1), 500);
      } else {
        setState('invalid');
      }
    };

    check(6);

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state === 'checking') {
    return (
      <Shell>
        <div className="flex flex-col items-center text-center py-6 space-y-3">
          <Loader2 className="w-6 h-6 text-ujlog-primary animate-spin" />
          <p className="text-xs text-ujlog-ink-soft font-medium">Confirmation de votre compte en cours...</p>
        </div>
      </Shell>
    );
  }

  if (state === 'invalid') {
    return (
      <Shell>
        <div className="text-center flex flex-col items-center">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-4 border border-red-100">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="font-display text-lg font-bold text-ujlog-ink mb-2">Lien invalide ou expiré</h1>
          <p className="text-xs text-ujlog-ink-soft leading-relaxed mb-6 max-w-xs">
            Ce lien de confirmation n&apos;est plus valide — il a peut-être déjà été utilisé ou a expiré.


Reconnectez-vous pour recevoir un nouveau lien.
          </p>
          <Link
            href="/login"
            className="w-full bg-ujlog-primary-dark text-white py-3 rounded-2xl font-bold text-sm hover:brightness-105 transition-all text-center block"
          >
            Aller à la connexion
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="text-center flex flex-col items-center">
        <div className="w-14 h-14 bg-ujlog-secondary-50 text-ujlog-secondary rounded-2xl flex items-center justify-center mb-4 border border-ujlog-secondary-100">
          <CheckCircle className="w-6 h-6" />
        </div>
        <h1 className="font-display text-lg font-bold text-ujlog-ink mb-2">Compte confirmé !</h1>
        <p className="text-xs text-ujlog-ink-soft leading-relaxed mb-6">
          Votre adresse e-mail a bien été vérifiée. Redirection vers votre tableau de bord...
        </p>
        <Loader2 className="w-5 h-5 text-ujlog-primary animate-spin" />
      </div>
    </Shell>
  );
}
