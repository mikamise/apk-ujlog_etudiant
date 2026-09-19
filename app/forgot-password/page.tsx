'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, CheckCircle, Mail, KeyRound } from 'lucide-react';

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  // Message transmis par /auth/callback quand un ancien lien de réinitialisation a expiré.
  const [error, setError] = useState(() => searchParams?.get('error') || '');
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

  const step = success ? 2 : 1;

  return (
    <div className="min-h-screen bg-ujlog-cream flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-soft-warm border border-ujlog-border overflow-hidden lg:grid lg:grid-cols-[280px_1fr]">

        {/* ===================== ASIDE / STEPPER (desktop uniquement) ===================== */}
        <aside className="hidden lg:flex flex-col bg-ujlog-cream border-r border-ujlog-border p-9">
          <div className="w-24 h-24 rounded-3xl bg-white p-3 shadow-xl border border-ujlog-border mb-8">
            <div className="relative w-full h-full">
              <Image src="/logo-geographie.jpg" alt="Logo Département de Géographie" fill className="object-contain rounded-2xl" referrerPolicy="no-referrer" />
            </div>
          </div>

          <div className="flex flex-col">
            {/* Étape 1 */}
            <div className="flex items-start gap-3.5 relative">
              <div className="absolute left-[15px] top-8 w-0.5 h-[calc(100%-0.5rem)] bg-ujlog-border" />
              <div className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold z-10 ${
                step >= 1 ? 'border-ujlog-primary bg-ujlog-primary text-white' : 'border-ujlog-border bg-white text-ujlog-ink-soft'
              }`}>
                {step > 1 ? <CheckCircle className="w-4 h-4" /> : '1'}
              </div>
              <div className="pt-1 pb-6">
                <div className={`text-[13px] font-bold ${step === 1 ? 'text-ujlog-primary-dark' : 'text-ujlog-ink'}`}>Adresse email</div>
                <div className="text-[11px] text-ujlog-ink-soft mt-0.5">Identifiez-vous</div>
              </div>
            </div>
            {/* Étape 2 */}
            <div className="flex items-start gap-3.5">
              <div className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold z-10 ${
                step === 2 ? 'border-ujlog-primary bg-ujlog-primary text-white' : 'border-ujlog-border bg-white text-ujlog-ink-soft'
              }`}>
                2
              </div>
              <div className="pt-1">
                <div className={`text-[13px] font-bold ${step === 2 ? 'text-ujlog-primary-dark' : 'text-ujlog-ink'}`}>Confirmation</div>
                <div className="text-[11px] text-ujlog-ink-soft mt-0.5">Vérifiez votre boîte</div>
              </div>
            </div>
          </div>
        </aside>

        {/* ===================== MAIN ===================== */}
        <div className="flex flex-col p-5 sm:p-9">

          {/* Header mobile uniquement */}
          <div className="lg:hidden flex items-center mb-5">
            <Link href="/login" className="flex items-center gap-2 text-ujlog-ink-soft hover:text-ujlog-ink transition-colors group">
              <div className="w-8 h-8 rounded-xl bg-ujlog-cream border border-ujlog-border flex items-center justify-center group-hover:border-ujlog-primary/40 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">Retour</span>
            </Link>
            {/* Indicateur d'étape compact */}
            <div className="flex items-center gap-1.5 ml-auto">
              <span className={`w-6 h-1.5 rounded-full ${step >= 1 ? 'bg-ujlog-primary' : 'bg-ujlog-border'}`} />
              <span className={`w-6 h-1.5 rounded-full ${step === 2 ? 'bg-ujlog-primary' : 'bg-ujlog-border'}`} />
            </div>
          </div>

          {!success ? (
            <>
              <span className="inline-flex items-center gap-1.5 bg-ujlog-primary-light text-ujlog-primary-dark text-xs font-bold px-3 py-1.5 rounded-xl mb-4 w-fit">
                <KeyRound className="w-3.5 h-3.5" />
                Réinitialisation
              </span>
              <h1 className="font-display text-2xl font-bold text-ujlog-ink mb-2">Mot de passe oublié&nbsp;?</h1>
              <p className="text-sm text-ujlog-ink-soft leading-relaxed mb-7 max-w-md">
                Entrez votre adresse email et nous vous enverrons un lien de réinitialisation sécurisé.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium border border-red-200/80">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col flex-1">
                <div className="space-y-1.5 mb-4">
                  <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">
                    Adresse email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-ujlog-ink-soft/60 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nom@exemple.com"
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border border-ujlog-border bg-white text-sm font-medium text-ujlog-ink placeholder:text-ujlog-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-ujlog-primary/20 focus:border-ujlog-primary transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-auto pt-6">
                  <Link
                    href="/login"
                    className="flex-1 py-3 rounded-2xl border-[1.5px] border-ujlog-border text-ujlog-ink-soft font-bold text-sm text-center hover:border-ujlog-primary hover:text-ujlog-primary-dark transition-colors"
                  >
                    Retour
                  </Link>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-3 rounded-2xl bg-ujlog-primary-dark text-white font-bold text-sm hover:brightness-105 transition-all disabled:opacity-70 cursor-pointer"
                  >
                    {isLoading ? 'Envoi…' : 'Envoyer le lien'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-col flex-1 items-center justify-center text-center py-6">
              <div className="w-20 h-20 rounded-full bg-ujlog-primary-light flex items-center justify-center mb-6">
                <CheckCircle className="w-9 h-9 text-ujlog-primary-dark" />
              </div>
              <h2 className="font-display text-xl font-bold text-ujlog-ink mb-2.5">Email envoyé&nbsp;!</h2>
              <p className="text-sm text-ujlog-ink-soft leading-relaxed max-w-xs">
                Si un compte est associé à cette adresse, un lien de réinitialisation a été envoyé à<br />
                <strong className="text-ujlog-ink">{email}</strong>
                <br /><br />
                Vérifiez votre boîte de réception et vos spams.
              </p>
              <div className="flex gap-3 mt-8 w-full max-w-xs">
                <button
                  type="button"
                  onClick={() => setSuccess(false)}
                  className="flex-1 py-3 rounded-2xl border-[1.5px] border-ujlog-border text-ujlog-ink-soft font-bold text-sm hover:border-ujlog-primary hover:text-ujlog-primary-dark transition-colors"
                >
                  Modifier l&apos;email
                </button>
                <Link
                  href="/login"
                  className="flex-1 py-3 rounded-2xl bg-ujlog-primary-dark text-white font-bold text-sm text-center hover:brightness-105 transition-all"
                >
                  Connexion
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
