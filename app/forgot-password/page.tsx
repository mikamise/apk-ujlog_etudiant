'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Veuillez saisir votre adresse e-mail.');
      return;
    }

    setIsLoading(true);

    try {
      // Vrai appel à l'API (avant : simulé par un setTimeout, aucune demande
      // n'était réellement envoyée à Supabase). La réponse est volontairement
      // générique côté serveur, qu'un compte existe ou non pour cette adresse.
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setSuccess(true);
    } catch {
      // Même en cas d'erreur réseau, on affiche le même message générique :
      // ne jamais laisser deviner si l'adresse existe à partir du comportement.
      setSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-ujlog-cream flex flex-col items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-soft-warm border border-ujlog-border p-8 text-center flex flex-col items-center">
          <div className="w-14 h-14 bg-ujlog-secondary-50 text-ujlog-secondary rounded-2xl flex items-center justify-center mb-5 border border-ujlog-secondary-100">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h1 className="font-display text-lg font-bold text-ujlog-ink mb-2">Instructions envoyées</h1>
          <p className="text-xs text-ujlog-ink-soft leading-relaxed mb-6">
            Si un compte est associé à cette adresse e-mail, vous recevrez un lien de réinitialisation d&apos;ici quelques minutes. Pensez à vérifier vos courriers indésirables.
          </p>
          <Link
            href="/login"
            className="w-full bg-ujlog-primary-dark text-white py-3 rounded-2xl font-bold text-sm hover:brightness-105 transition-all text-center block"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

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
          <div className="text-center mb-6">
            <h1 className="font-display text-lg font-bold text-ujlog-ink mb-1.5">Mot de passe oublié ?</h1>
            <p className="text-xs text-ujlog-ink-soft">
              Entrez votre adresse e-mail afin de recevoir les instructions permettant de réinitialiser votre mot de passe.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium border border-red-200/80">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Entrez votre email"
                className="w-full px-4 py-3 rounded-2xl border border-ujlog-border bg-white text-sm font-medium text-ujlog-ink placeholder:text-ujlog-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-ujlog-primary/20 focus:border-ujlog-primary transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-ujlog-primary-dark text-white py-3.5 rounded-2xl font-bold text-sm hover:brightness-105 transition-all disabled:opacity-70 cursor-pointer mt-2"
            >
              {isLoading ? 'Envoi en cours...' : 'Envoyer les instructions'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
