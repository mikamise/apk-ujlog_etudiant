'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, ArrowLeft, Check, UserPlus, AlertCircle, ArrowRight } from 'lucide-react';
import { PasswordStrengthMeter, evaluatePassword } from '@/components/auth/password-strength-meter';

export default function RegisterPage() {
  const [step, setStep] = useState(1);
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

  const passwordEvaluation = evaluatePassword(formData.password);

  const handleNext = () => {
    setError('');

    if (step === 1) {
      if (!formData.lastName.trim() || !formData.firstName.trim()) {
        setError('Veuillez renseigner votre nom et votre prénom.');
        return;
      }
    } else if (step === 2) {
      if (!formData.level || !formData.field) {
        setError('Veuillez sélectionner votre niveau et votre filière.');
        return;
      }
    } else if (step === 3) {
      const cleanEmail = formData.email.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!cleanEmail) {
        setError('Veuillez renseigner votre adresse e-mail.');
        return;
      }

      if (!emailRegex.test(cleanEmail)) {
        setError('Veuillez saisir une adresse e-mail valide (ex: etudiant@ujlog.ci).');
        return;
      }

      if (!formData.password) {
        setError('Veuillez renseigner un mot de passe.');
        return;
      }

      // Check all 4 mandatory password rules
      if (!passwordEvaluation.hasMinLength) {
        setError('Le mot de passe doit comporter au moins 8 caractères.');
        return;
      }

      if (!passwordEvaluation.hasUppercase) {
        setError('Le mot de passe doit contenir au moins une lettre majuscule (A-Z).');
        return;
      }

      if (!passwordEvaluation.hasLowercase) {
        setError('Le mot de passe doit contenir au moins une lettre minuscule (a-z).');
        return;
      }

      if (!passwordEvaluation.hasNumber) {
        setError('Le mot de passe doit contenir au moins un chiffre (0-9).');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Les mots de passe ne correspondent pas.');
        return;
      }
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.acceptedTerms) {
      setError('Veuillez accepter les conditions pour finaliser votre inscription.');
      return;
    }

    // Final security check before submission
    if (!passwordEvaluation.isAllMandatoryMet) {
      setError('Le mot de passe doit comporter au moins 8 caractères avec majuscule, minuscule et chiffre.');
      setStep(3);
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
      setSuccess(true);
    } catch {
      setError("Une erreur technique est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
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
        <div className="bg-ujlog-cream-2 w-full max-w-sm rounded-[32px] shadow-soft-warm border border-white/60 p-6 sm:p-7 text-center flex flex-col items-center space-y-4 relative z-10">
          <div className="w-14 h-14 bg-green-gradient text-white rounded-2xl flex items-center justify-center shadow-glow-green">
            <Check className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h2 className="font-display text-base font-bold text-ujlog-ink tracking-tight">Vérifiez votre boîte mail</h2>
            <p className="text-xs text-ujlog-ink-soft font-normal leading-relaxed">
              Bienvenue, <strong className="text-ujlog-ink">{formData.civility} {formData.firstName} {formData.lastName}</strong>. Un e-mail de confirmation vient d&apos;être envoyé à votre adresse. Cliquez sur le lien qu&apos;il contient pour activer votre compte.
            </p>
          </div>

          <div className="w-full bg-ujlog-cream rounded-2xl p-3 border border-ujlog-border text-left text-xs space-y-1">
            <p className="text-[10px] uppercase font-bold text-ujlog-ink-soft/70">Adresse à confirmer</p>
            <p className="font-semibold text-ujlog-ink truncate">{formData.email}</p>
            <p className="text-[11px] text-ujlog-primary-dark font-bold">{formData.level} • {formData.field}</p>
          </div>

          <p className="text-[11px] text-ujlog-ink-soft/80 leading-relaxed">
            Vous ne recevez rien ? Vérifiez vos courriers indésirables, ou réessayez dans quelques minutes.
          </p>

          <Link
            href="/login"
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
    <div className="min-h-screen bg-terracotta-gradient flex flex-col justify-between relative overflow-hidden">

      <svg className="absolute -top-24 -right-28 w-[500px] h-[500px] opacity-30 pointer-events-none" viewBox="0 0 480 480" fill="none">
        <circle cx="300" cy="120" r="90" stroke="rgba(255,247,237,0.3)" strokeWidth="1.5" />
        <circle cx="300" cy="120" r="140" stroke="rgba(255,247,237,0.2)" strokeWidth="1.5" />
        <circle cx="300" cy="120" r="190" stroke="rgba(255,247,237,0.12)" strokeWidth="1.5" />
      </svg>

      {/* Header */}
      <header className="relative z-30 w-full px-4 py-4 sm:px-8 sm:py-4 flex items-center justify-between">
        <Link href="/login" className="flex items-center gap-2 text-orange-50/85 hover:text-white transition-colors group">
          <div className="w-7 h-7 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider hidden sm:block">Retour connexion</span>
        </Link>
        <span className="font-display font-bold text-orange-50 tracking-tight text-sm">UJLOG ÉTUDIANT</span>
      </header>

      {/* Main Form Container */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-3 sm:p-4 md:p-6 py-4 sm:py-6 w-full">

        {/* Stepper Indicator */}
        <div className="w-full max-w-sm sm:max-w-md mb-5 px-1">
          <div className="flex justify-between items-center relative z-10 px-3">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${step === s ? 'bg-terracotta-gradient text-white shadow-glow-orange' :
                    step > s ? 'bg-green-gradient text-white' : 'bg-white/15 text-orange-50/70 border border-white/20'
                  }`}>
                  {step > s ? <Check className="w-3.5 h-3.5" /> : s}
                </div>
              </div>
            ))}
            <div className="absolute top-3.5 left-8 right-8 h-0.5 bg-white/20 -z-10">
              <div
                className="h-full bg-green-gradient transition-all duration-300"
                style={{ width: `${((step - 1) / 3) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between px-1 mt-2 text-[10px] font-bold uppercase text-orange-50/70 tracking-wider">
            <span>Identité</span>
            <span>Parcours</span>
            <span>Sécurité</span>
            <span>Validation</span>
          </div>
        </div>

        <div className="bg-ujlog-cream-2 w-full max-w-sm sm:max-w-md rounded-[32px] shadow-soft-warm border border-white/60 p-5 sm:p-7 space-y-4">

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium border border-red-200/80 flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Identity */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center space-y-0.5 mb-3">
                <h1 className="text-base font-bold text-ujlog-ink tracking-tight">Vos Informations</h1>
                <p className="text-xs text-ujlog-ink-soft font-normal">Renseignez votre identité réelle d&apos;étudiant.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">Civilité</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Monsieur', 'Madame', 'Mademoiselle'].map((civ) => (
                    <button
                      key={civ}
                      type="button"
                      onClick={() => setFormData({ ...formData, civility: civ })}
                      className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all cursor-pointer ${formData.civility === civ
                          ? 'border-orange-700 bg-orange-50 text-orange-900 shadow-2xs'
                          : 'border-ujlog-border bg-ujlog-cream text-ujlog-ink-soft hover:bg-white'
                        }`}
                    >
                      {civ === 'Monsieur' ? 'M.' : civ === 'Madame' ? 'Mme' : 'Mlle'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">Nom de famille</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Ex: Kouassi"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ujlog-border bg-ujlog-cream text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/25 focus:border-ujlog-secondary transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">Prénom(s)</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Ex: Jean Emmanuel"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ujlog-border bg-ujlog-cream text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/25 focus:border-ujlog-secondary transition-all"
                />
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="w-full mt-2 bg-terracotta-gradient text-white py-3 rounded-2xl font-bold text-xs shadow-glow-orange hover:brightness-110 transition-all cursor-pointer"
              >
                Continuer
              </button>
            </div>
          )}

          {/* STEP 2: Academic Program */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center space-y-0.5 mb-3">
                <h1 className="text-base font-bold text-ujlog-ink tracking-tight">Parcours Académique</h1>
                <p className="text-xs text-ujlog-ink-soft font-normal">Indiquez votre promotion et filière.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">Niveau d&apos;études</label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ujlog-border bg-ujlog-cream text-xs sm:text-sm font-medium text-ujlog-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/25 focus:border-ujlog-secondary transition-all"
                >
                  <option value="" disabled>Sélectionnez votre niveau</option>
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ujlog-border bg-ujlog-cream text-xs sm:text-sm font-medium text-ujlog-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/25 focus:border-ujlog-secondary transition-all"
                >
                  <option value="" disabled>Sélectionnez votre filière</option>
                  <option value="Histoire-Géographie">Histoire-Géographie</option>
                  <option value="Histoire">Histoire</option>
                  <option value="Géographie">Géographie</option>
                  <option value="Docteur">Docteur</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="w-1/3 bg-white border border-ujlog-border text-ujlog-ink-soft py-3 rounded-2xl font-bold text-xs hover:bg-ujlog-cream transition-colors"
                >
                  Retour
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-2/3 bg-terracotta-gradient text-white py-3 rounded-2xl font-bold text-xs shadow-glow-orange hover:brightness-110 transition-all"
                >
                  Continuer
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Email & Password with Strength Progress Bar */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center space-y-0.5 mb-2">
                <h1 className="text-base font-bold text-ujlog-ink tracking-tight">Vos Identifiants & Sécurité</h1>
                <p className="text-xs text-ujlog-ink-soft font-normal">Définissez un mot de passe sécurisé pour votre compte.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">Adresse e-mail</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Entrez votre e-mail"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ujlog-border bg-ujlog-cream text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/25 focus:border-ujlog-secondary transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Entrez votre mot de passe"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-ujlog-border bg-ujlog-cream text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/25 focus:border-ujlog-secondary transition-all"
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

              {/* Password Strength Progress Bar Component */}
              <PasswordStrengthMeter password={formData.password} />

              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">Confirmer le mot de passe</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Confirmez votre mot de passe"
                    className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border bg-ujlog-cream text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 transition-all ${formData.confirmPassword && formData.password !== formData.confirmPassword
                        ? 'border-red-300 focus:ring-red-500/20 focus:border-red-600'
                        : 'border-ujlog-border focus:ring-green-500/25 focus:border-ujlog-secondary'
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
                  <p className="text-[10px] text-orange-700 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Les mots de passe correspondent</span>
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="w-1/3 bg-white border border-ujlog-border text-ujlog-ink-soft py-3 rounded-2xl font-bold text-xs hover:bg-ujlog-cream transition-colors"
                >
                  Retour
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-2/3 bg-terracotta-gradient text-white py-3 rounded-2xl font-bold text-xs shadow-glow-orange hover:brightness-110 transition-all"
                >
                  Continuer
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Summary & Validation */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="text-center space-y-0.5 mb-2">
                <h1 className="text-base font-bold text-ujlog-ink tracking-tight">Récapitulatif</h1>
                <p className="text-xs text-ujlog-ink-soft font-normal">Vérifiez vos informations avant de créer le compte.</p>
              </div>

              <div className="bg-ujlog-cream rounded-2xl p-4 border border-ujlog-border space-y-2.5 text-xs">
                <div className="flex justify-between border-b border-ujlog-border pb-2">
                  <span className="text-[10px] font-bold text-ujlog-ink-soft/70 uppercase">Étudiant</span>
                  <span className="font-bold text-ujlog-ink">{formData.civility} {formData.lastName} {formData.firstName}</span>
                </div>
                <div className="flex justify-between border-b border-ujlog-border pb-2">
                  <span className="text-[10px] font-bold text-ujlog-ink-soft/70 uppercase">Cursus</span>
                  <span className="font-bold text-orange-800">{formData.level} • {formData.field}</span>
                </div>
                <div className="flex justify-between border-b border-ujlog-border pb-2">
                  <span className="text-[10px] font-bold text-ujlog-ink-soft/70 uppercase">Email</span>
                  <span className="font-semibold text-ujlog-ink-soft truncate max-w-[180px]">{formData.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-ujlog-ink-soft/70 uppercase">Sécurité</span>
                  <span className="text-[11px] font-bold text-orange-800 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                    MDP Conforme ({passwordEvaluation.levelLabel})
                  </span>
                </div>
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formData.acceptedTerms}
                  onChange={(e) => setFormData({ ...formData, acceptedTerms: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded border-ujlog-border text-orange-700 focus:ring-green-500 cursor-pointer text-ujlog-secondary"
                />
                <span className="text-[11px] text-ujlog-ink-soft leading-tight">
                  J&apos;atteste être étudiant à l&apos;Université Jean Lorougnon Guédé et j&apos;accepte les conditions d&apos;utilisation.
                </span>
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isLoading}
                  className="w-1/3 bg-white border border-ujlog-border text-ujlog-ink-soft py-3 rounded-2xl font-bold text-xs hover:bg-ujlog-cream transition-colors"
                >
                  Retour
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading || !formData.acceptedTerms}
                  className="w-2/3 bg-terracotta-gradient text-white py-3 rounded-2xl font-bold text-xs shadow-glow-orange hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'Création...' : 'Finaliser mon compte'}</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* /* Footer
      <footer className="py-3 text-center text-[10px] text-ujlog-ink-soft/70 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        © 2026 Université Jean Lorougnon Guédé • Département de Géographie. Tous droits réservés.
      </footer> */}

    </div>
  );
}
