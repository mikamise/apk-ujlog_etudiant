'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, ArrowLeft, Check, UserPlus, AlertCircle, ArrowRight, User, Mail, Lock, GraduationCap, BookOpen, Download, RefreshCw } from 'lucide-react';
import { PasswordStrengthMeter, evaluatePassword } from '@/components/auth/password-strength-meter';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    civility: 'Monsieur',
    lastName: '',
    firstName: '',
    level: '',
    field: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptedTerms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState(true);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  const passwordEvaluation = evaluatePassword(formData.password);

  const validate = (): string => {
    if (!formData.lastName.trim() || !formData.firstName.trim()) {
      return 'Veuillez renseigner votre nom et votre prénom.';
    }
    if (!formData.level || !formData.field) {
      return 'Veuillez sélectionner votre niveau et votre filière.';
    }

    const cleanEmail = formData.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanEmail) {
      return 'Veuillez renseigner votre adresse e-mail.';
    }
    if (!emailRegex.test(cleanEmail)) {
      return 'Veuillez saisir une adresse e-mail valide (ex: etudiant@ujlog.ci).';
    }
    if (!formData.password) {
      return 'Veuillez renseigner un mot de passe.';
    }
    if (!passwordEvaluation.hasMinLength) {
      return 'Le mot de passe doit comporter au moins 8 caractères.';
    }
    if (!passwordEvaluation.hasUppercase) {
      return 'Le mot de passe doit contenir au moins une lettre majuscule (A-Z).';
    }
    if (!passwordEvaluation.hasLowercase) {
      return 'Le mot de passe doit contenir au moins une lettre minuscule (a-z).';
    }
    if (!passwordEvaluation.hasNumber) {
      return 'Le mot de passe doit contenir au moins un chiffre (0-9).';
    }
    if (formData.password !== formData.confirmPassword) {
      return 'Les mots de passe ne correspondent pas.';
    }
    if (!formData.acceptedTerms) {
      return 'Veuillez accepter les conditions pour finaliser votre inscription.';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Erreur lors de la création du compte.");
        setIsLoading(false);
        return;
      }

      // IMPORTANT : on NE met PAS l'utilisateur en cache comme "connecté" ici.
      // La confirmation par e-mail est obligatoire (voir /api/auth/login, qui
      // refuse toute connexion tant que email_confirmed_at est vide) : traiter
      // l'inscription comme une connexion immédiate serait exactement le
      // contournement de vérification que Phase 3 §1 interdit explicitement.
      setEmailSent(data.emailSent !== false);
      setSuccess(true);
    } catch {
      setError("Une erreur technique est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setResendState('sending');
    try {
      await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email.trim().toLowerCase() }),
      });
    } catch {
      // réponse générique de toute façon
    } finally {
      setResendState('sent');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-terracotta-gradient flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        <svg className="absolute -top-20 -right-24 w-[420px] h-[420px] opacity-40 pointer-events-none" viewBox="0 0 480 480" fill="none">
          <circle cx="300" cy="120" r="90" stroke="rgba(255,247,237,0.3)" strokeWidth="1.5" />
          <circle cx="300" cy="120" r="140" stroke="rgba(255,247,237,0.2)" strokeWidth="1.5" />
          <circle cx="300" cy="120" r="190" stroke="rgba(255,247,237,0.12)" strokeWidth="1.5" />
        </svg>
        <div className="bg-ujlog-cream-2 w-full max-w-sm rounded-3xl shadow-soft-warm border border-white/60 p-6 sm:p-7 text-center flex flex-col items-center space-y-4 relative z-10">
          <div className="w-14 h-14 bg-green-gradient text-white rounded-2xl flex items-center justify-center shadow-glow-green">
            <Check className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h2 className="font-display text-lg font-bold text-ujlog-ink tracking-tight">Vérifiez votre boîte mail</h2>
            <p className="text-xs text-ujlog-ink-soft font-normal leading-relaxed">
              Bienvenue, <strong className="text-ujlog-ink">{formData.civility} {formData.firstName} {formData.lastName}</strong>. {emailSent
                ? <>Un e-mail de confirmation vient d&apos;être envoyé à votre adresse. Cliquez sur le lien qu&apos;il contient, puis connectez-vous avec votre e-mail et votre mot de passe.</>
                : <>Votre compte est créé, mais l&apos;e-mail de confirmation n&apos;a pas pu être envoyé. Utilisez le bouton ci-dessous pour le renvoyer.</>}
            </p>
          </div>

          <div className="w-full bg-ujlog-cream rounded-2xl p-3 border border-ujlog-border text-left text-xs space-y-1">
            <p className="text-[10px] uppercase font-bold text-ujlog-ink-soft/70">Adresse à confirmer</p>
            <p className="font-semibold text-ujlog-ink truncate">{formData.email}</p>
            <p className="text-[11px] text-ujlog-primary-dark font-bold">{formData.level} • {formData.field}</p>
          </div>

          <p className="text-[11px] text-ujlog-ink-soft/80 leading-relaxed">
            Vous ne recevez rien ? Vérifiez vos courriers indésirables, ou renvoyez l&apos;e-mail.
          </p>

          <button
            type="button"
            onClick={handleResend}
            disabled={resendState !== 'idle'}
            className="w-full bg-white border border-ujlog-border text-ujlog-ink py-2.5 rounded-2xl font-bold text-xs hover:border-ujlog-primary-dark transition-colors disabled:opacity-60 cursor-pointer"
          >
            {resendState === 'sending'
              ? 'Envoi en cours...'
              : resendState === 'sent'
              ? 'E-mail renvoyé'
              : "Renvoyer l'e-mail de confirmation"}
          </button>

          <Link
            href={`/login?email=${encodeURIComponent(formData.email.trim().toLowerCase())}`}
            className="w-full bg-ujlog-primary-dark text-white py-3 rounded-2xl font-bold text-xs hover:brightness-105 transition-all flex items-center justify-center gap-2"
          >
            <span>Aller à la page de connexion</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-2">

      {/* ===================== PANNEAU DE MARQUE (masqué sur mobile) ===================== */}
      <div className="hidden lg:flex relative flex-col justify-between overflow-hidden bg-terracotta-gradient p-12 text-white lg:sticky lg:top-0 lg:h-screen">
        <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute bottom-1/3 right-16 w-28 h-28 rounded-full bg-white/10" />

        <Link href="/login" className="relative z-10 inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Retour connexion</span>
        </Link>

        <div className="relative z-10 space-y-8">
          <div className="w-40 h-40 rounded-3xl bg-white p-4 shadow-2xl">
            <div className="relative w-full h-full">
              <Image src="/logo-geographie.jpg" alt="Logo Département de Géographie" fill className="object-contain rounded-2xl" referrerPolicy="no-referrer" />
            </div>
          </div>

          <div>
            <h1 className="font-display text-4xl font-bold leading-tight">Créez votre compte</h1>
            <p className="mt-3 text-sm text-white/85 leading-relaxed max-w-xs">
              Inscrivez-vous en tant qu&apos;étudiant du Département de Géographie pour accéder à tous les cours de votre niveau.
            </p>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-5 h-5 text-white/90 shrink-0" />
              <span className="text-sm text-white/90">Contenu propre à votre niveau et filière</span>
            </div>
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-white/90 shrink-0" />
              <span className="text-sm text-white/90">Téléchargement et accès hors ligne</span>
            </div>
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-white/90 shrink-0" />
              <span className="text-sm text-white/90">Contenu mis à jour chaque semaine</span>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-[11px] text-white/60">
          © 2026 Département de Géographie, UJLoG Daloa
        </p>
      </div>

      {/* ===================== PANNEAU FORMULAIRE — page longue, un seul défilement ===================== */}
      <div className="relative flex flex-col min-h-screen">

        {/* Header mobile uniquement */}
        <header className="lg:hidden relative z-10 w-full px-4 py-4 sm:px-8 sm:py-5 flex items-center">
          <Link href="/login" className="flex items-center gap-2 text-ujlog-ink-soft hover:text-ujlog-ink transition-colors group">
            <div className="w-8 h-8 rounded-xl bg-white border border-ujlog-border flex items-center justify-center group-hover:border-ujlog-primary/40 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">Retour</span>
          </Link>
        </header>

        <main className="relative z-10 flex-1 flex items-start justify-center p-4 py-6 sm:p-8 lg:p-12">
          <form onSubmit={handleSubmit} className="w-full max-w-md space-y-8">

            {/* Logo — mobile uniquement */}
            <div className="flex lg:hidden justify-center">
              <div className="w-24 h-24 rounded-3xl bg-white shadow-xl border border-ujlog-border flex items-center justify-center p-3">
                <div className="relative w-full h-full">
                  <Image src="/logo-geographie.jpg" alt="Logo Département de Géographie" fill className="object-contain" referrerPolicy="no-referrer" />
                </div>
              </div>
            </div>

            <div className="text-center lg:text-left space-y-1.5">
              <h2 className="font-display text-2xl font-bold text-ujlog-ink tracking-tight">Créer un compte</h2>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium border border-red-200/80 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* ---- Identité ---- */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-ujlog-primary-dark" />
                <h3 className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider">Votre identité</h3>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">Civilité</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Monsieur', 'Madame', 'Mademoiselle'].map((civ) => (
                    <button
                      key={civ}
                      type="button"
                      onClick={() => setFormData({ ...formData, civility: civ })}
                      className={`py-2.5 px-1 text-xs font-bold rounded-xl border transition-all cursor-pointer ${formData.civility === civ
                          ? 'border-ujlog-primary-dark bg-ujlog-primary-light text-ujlog-primary-dark'
                          : 'border-ujlog-border bg-ujlog-cream text-ujlog-ink-soft hover:bg-white'
                        }`}
                    >
                      {civ === 'Monsieur' ? 'M.' : civ === 'Madame' ? 'Mme' : 'Mlle'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">Nom de famille</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Votre nom"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-ujlog-border bg-ujlog-cream text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-ujlog-primary/20 focus:border-ujlog-primary transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">Prénom(s)</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Votre prénom"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-ujlog-border bg-ujlog-cream text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-ujlog-primary/20 focus:border-ujlog-primary transition-all"
                  />
                </div>
              </div>
            </section>

            {/* ---- Parcours académique ---- */}
            <section className="space-y-4 pt-2 border-t border-ujlog-border">
              <div className="flex items-center gap-2 pt-4">
                <BookOpen className="w-4 h-4 text-ujlog-primary-dark" />
                <h3 className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider">Parcours académique</h3>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">Niveau d&apos;études</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-ujlog-border bg-ujlog-cream text-sm font-medium text-ujlog-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-ujlog-primary/20 focus:border-ujlog-primary transition-all"
                  >
                    <option value="" disabled>Votre niveau</option>
                    <option value="Licence 1">Licence 1</option>
                    <option value="Licence 2">Licence 2</option>
                    <option value="Licence 3">Licence 3</option>
                    <option value="Master 1">Master 1</option>
                    <option value="Master 2">Master 2</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">Filière / Spécialité</label>
                  <select
                    value={formData.field}
                    onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-ujlog-border bg-ujlog-cream text-sm font-medium text-ujlog-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-ujlog-primary/20 focus:border-ujlog-primary transition-all"
                  >
                    <option value="" disabled>Votre filière</option>
                    <option value="Histoire-Géographie">Histoire-Géographie</option>
                    <option value="Histoire">Histoire</option>
                    <option value="Géographie">Géographie</option>
                    <option value="Docteur">Docteur</option>
                  </select>
                </div>
              </div>
            </section>

            {/* ---- Identifiants & sécurité ---- */}
            <section className="space-y-4 pt-2 border-t border-ujlog-border">
              <div className="flex items-center gap-2 pt-4">
                <Lock className="w-4 h-4 text-ujlog-primary-dark" />
                <h3 className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider">Identifiants &amp; sécurité</h3>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">Adresse e-mail</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-ujlog-ink-soft/60 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="nom@exemple.com"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-ujlog-border bg-ujlog-cream text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-ujlog-primary/20 focus:border-ujlog-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">Mot de passe</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-ujlog-ink-soft/60 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Votre mot de passe"
                    className="w-full pl-11 pr-11 py-2.5 rounded-xl border border-ujlog-border bg-ujlog-cream text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-ujlog-primary/20 focus:border-ujlog-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ujlog-ink-soft/70 hover:text-ujlog-ink-soft p-1"
                    aria-label="Afficher ou masquer mot de passe"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <PasswordStrengthMeter password={formData.password} />

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">Confirmer le mot de passe</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-ujlog-ink-soft/60 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Confirmez votre mot de passe"
                    className={`w-full pl-11 pr-11 py-2.5 rounded-xl border bg-ujlog-cream text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 transition-all ${formData.confirmPassword && formData.password !== formData.confirmPassword
                        ? 'border-red-300 focus:ring-red-500/20 focus:border-red-600'
                        : 'border-ujlog-border focus:ring-ujlog-primary/20 focus:border-ujlog-primary'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ujlog-ink-soft/70 hover:text-ujlog-ink-soft p-1"
                    aria-label="Afficher ou masquer mot de passe"
                  >
                    {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-[10px] text-red-600 font-semibold">Les mots de passe ne correspondent pas.</p>
                )}
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <p className="text-[10px] text-ujlog-secondary-dark font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Les mots de passe correspondent</span>
                  </p>
                )}
              </div>
            </section>

            {/* ---- Validation ---- */}
            <section className="space-y-4 pt-2 border-t border-ujlog-border">
              <label className="flex items-start gap-2.5 cursor-pointer pt-4">
                <input
                  type="checkbox"
                  checked={formData.acceptedTerms}
                  onChange={(e) => setFormData({ ...formData, acceptedTerms: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded border-ujlog-border text-ujlog-primary focus:ring-ujlog-primary/30 cursor-pointer"
                />
                <span className="text-xs text-ujlog-ink-soft leading-tight">
                  J&apos;atteste être étudiant au Département de Géographie de l&apos;Université Jean Lorougnon Guédé et j&apos;accepte les{' '}
                  <Link href="/conditions" target="_blank" className="font-bold text-ujlog-primary hover:text-ujlog-primary-dark underline">
                    conditions d&apos;utilisation
                  </Link>.
                </span>
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-terracotta-gradient text-white py-3.5 rounded-2xl font-bold text-sm shadow-glow-orange hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-70 cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Création du compte…</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Créer mon compte</span>
                  </>
                )}
              </button>
            </section>

            <div className="pt-2 text-center">
              <p className="text-xs text-ujlog-ink-soft">
                Vous avez déjà un compte ?{' '}
                <Link href="/login" className="font-bold text-ujlog-primary hover:text-ujlog-primary-dark transition-colors">
                  Se connecter
                </Link>
              </p>
            </div>

          </form>
        </main>

      </div>
    </div>
  );
}
