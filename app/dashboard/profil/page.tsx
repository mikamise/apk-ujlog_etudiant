'use client';

import { useState, useRef } from 'react';
import { useUser } from '@/hooks/use-user';
import Image from 'next/image';
import Link from 'next/link';
import { 
  User, 
  Camera, 
  Save, 
  Check, 
  ArrowLeft, 
  Mail, 
  GraduationCap, 
  Sparkles, 
  IdCard,
  Building2,
  Lock,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PasswordStrengthMeter, evaluatePassword } from '@/components/auth/password-strength-meter';
import {
  LEVEL_CODE_TO_LABEL,
  FIELD_CODE_TO_LABEL,
  FIELD_LABEL_TO_CODE,
  OPTION_FIELD_CODES,
  LEVELS_REQUIRING_OPTION,
  getNextLevel,
} from '@/lib/academic-reference';

export default function ProfilPage() {
  const { user, updateUser, updateAvatar } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // user.level / user.field sont stockés en code (ex. 'l2', 'histoire') —
  // on convertit en libellé lisible uniquement pour l'affichage.
  const currentLevelCode = user.level || 'l1';
  const currentLevelLabel = LEVEL_CODE_TO_LABEL[currentLevelCode] || currentLevelCode;
  const currentFieldLabel = FIELD_CODE_TO_LABEL[user.field || 'tronc_commun'] || (user.field || 'Tronc commun');

  const [formData, setFormData] = useState({
    civility: user.civility || 'Monsieur',
    lastName: user.lastName || '',
    firstName: user.firstName || '',
    email: user.email || '',
    level: currentLevelLabel,
    field: currentFieldLabel,
    academicYear: user.academicYear || '2026-2027',
    studentId: user.studentId || 'UJLOG-2026-0842',
  });

  const nextLevelCode = getNextLevel(currentLevelCode);
  const nextLevelLabel = nextLevelCode ? LEVEL_CODE_TO_LABEL[nextLevelCode] : null;
  const nextRequiresOption = nextLevelCode ? LEVELS_REQUIRING_OPTION.has(nextLevelCode) : false;

  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [selectedOptionCode, setSelectedOptionCode] = useState('');
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [advanceError, setAdvanceError] = useState('');
  const [advanceSuccess, setAdvanceSuccess] = useState(false);

  const handleAdvanceLevel = async () => {
    setAdvanceError('');
    if (nextRequiresOption && !selectedOptionCode) {
      setAdvanceError('Veuillez sélectionner une option pour continuer.');
      return;
    }
    setIsAdvancing(true);
    try {
      const res = await fetch('/api/student/advance-level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextRequiresOption ? { optionFieldCode: selectedOptionCode } : {}),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) {
        setAdvanceError(payload?.error || 'Impossible de passer au niveau supérieur.');
        setIsAdvancing(false);
        return;
      }
      updateUser({
        level: payload.data.level_code,
        field: payload.data.field_code,
      });
      setAdvanceSuccess(true);
      setIsAdvancing(false);
    } catch {
      setAdvanceError('Une erreur technique est survenue.');
      setIsAdvancing(false);
    }
  };

  const [isSavedAlert, setIsSavedAlert] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatarUrl || null);

  // Password update state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const newPwEval = evaluatePassword(newPassword);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('L’image est trop volumineuse (max 3Mo).');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarPreview(result);
        updateAvatar(result);
        fetch('/api/student/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatarUrl: result }),
        }).catch(() => {
          // L'aperçu local reste affiché même si la sauvegarde distante échoue ;
          // l'utilisateur le reverra simplement au prochain appareil/session.
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    setIsSaving(true);

    // Correspondance civilité affichée -> code stocké en base.
    const civilityCode = formData.civility === 'Madame' ? 'mme' : formData.civility === 'Mademoiselle' ? 'mlle' : 'm';

    try {
      const res = await fetch('/api/student/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          civility: civilityCode,
          firstName: formData.firstName,
          lastName: formData.lastName,
        }),
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.success) {
        setSaveError(payload?.error || 'Impossible d’enregistrer vos modifications.');
        setIsSaving(false);
        return;
      }

      // Reflète immédiatement les champs modifiés dans le cache d'affichage local.
      updateUser(formData);
      setIsSavedAlert(true);
      setTimeout(() => setIsSavedAlert(false), 3000);
    } catch {
      setSaveError('Une erreur technique est survenue. Vérifiez votre connexion.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError('Veuillez saisir votre mot de passe actuel.');
      return;
    }

    if (!newPwEval.hasMinLength) {
      setPasswordError('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }
    if (!newPwEval.hasUppercase) {
      setPasswordError('Le mot de passe doit contenir au moins une lettre majuscule (A-Z).');
      return;
    }
    if (!newPwEval.hasLowercase) {
      setPasswordError('Le mot de passe doit contenir au moins une lettre minuscule (a-z).');
      return;
    }
    if (!newPwEval.hasNumber) {
      setPasswordError('Le mot de passe doit contenir au moins un chiffre (0-9).');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas.');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setPasswordError(data.error || 'Erreur lors de la modification du mot de passe.');
        setIsUpdatingPassword(false);
        return;
      }

      setPasswordSuccess(true);
      setTimeout(() => {
        setPasswordSuccess(false);
        setIsPasswordModalOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 2000);
    } catch {
      setPasswordError('Une erreur technique est survenue. Vérifiez votre connexion.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-5">
      
      {/* Top Breadcrumb Link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-ujlog-ink-soft hover:text-ujlog-primary-dark transition-colors font-semibold text-xs group"
      >
        <div className="w-6 h-6 rounded-lg bg-white border border-ujlog-border flex items-center justify-center group-hover:bg-orange-50 transition-colors">
          <ArrowLeft className="w-3 h-3" />
        </div>
        <span>Tableau de bord</span>
      </Link>

      {/* Header Banner */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-terracotta-gradient p-4 sm:p-5 rounded-[24px] shadow-glow-orange overflow-hidden">
        <svg className="absolute -top-10 -right-14 w-56 h-56 opacity-25 pointer-events-none" viewBox="0 0 480 480" fill="none">
          <circle cx="300" cy="150" r="90" stroke="rgba(255,247,237,0.3)" strokeWidth="1.5" />
          <circle cx="300" cy="150" r="140" stroke="rgba(255,247,237,0.18)" strokeWidth="1.5" />
        </svg>
        <div className="relative z-10 flex items-center gap-3.5 sm:gap-4">
          
          {/* Avatar Upload Container */}
          <div className="relative group cursor-pointer shrink-0" onClick={handleAvatarClick}>
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-green-gradient text-white flex items-center justify-center font-extrabold text-base sm:text-lg overflow-hidden shadow-glow-green border-2 border-white/30">
              {avatarPreview ? (
                <Image src={avatarPreview} alt="Photo de profil" fill className="object-cover" />
              ) : (
                <span>{(formData.firstName?.[0] || 'E') + (formData.lastName?.[0] || '')}</span>
              )}
            </div>
            
            {/* Camera Overlay Icon */}
            <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Camera className="w-5 h-5" />
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <div className="relative z-10 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-sm sm:text-base font-bold text-orange-50 truncate">
                {formData.civility} {formData.firstName} {formData.lastName}
              </h1>
              <span className="text-[10px] bg-white/15 text-orange-50 font-bold px-2 py-0.5 rounded-full border border-white/25">
                Compte Actif
              </span>
            </div>
            <p className="text-xs text-orange-50/85 font-medium mt-0.5 truncate">
              {formData.level} • {formData.field}
            </p>
            <p className="text-[11px] text-orange-50/65 font-medium">
              ID Étudiant : <strong className="text-orange-50/85 font-semibold">{formData.studentId}</strong>
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={handleAvatarClick}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white/12 hover:bg-white/20 text-orange-50 border border-white/25 rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[38px]"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Changer photo</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      <AnimatePresence>
        {isSavedAlert && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-orange-50 text-ujlog-primary-dark rounded-xl border border-orange-200 text-xs font-semibold flex items-center gap-2 shadow-2xs"
          >
            <Check className="w-4 h-4 text-orange-700 shrink-0" />
            <span>Vos informations personnelles ont été mises à jour avec succès !</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Edit Form */}
      <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-2xl border border-ujlog-border shadow-2xs space-y-5">
        
        <div className="border-b border-ujlog-border pb-3">
          <h2 className="text-xs sm:text-sm font-bold text-ujlog-ink tracking-tight">
            Informations Personnelles & Universitaires
          </h2>
          <p className="text-xs text-ujlog-ink-soft font-normal mt-0.5">
            Modifiez et enregistrez vos informations d&apos;étudiant.
          </p>
        </div>

        {/* Civility */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">Civilité</label>
          <div className="grid grid-cols-3 gap-2 max-w-sm">
            {['Monsieur', 'Madame', 'Mademoiselle'].map((civ) => (
              <button
                key={civ}
                type="button"
                onClick={() => setFormData({ ...formData, civility: civ })}
                className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer min-h-[40px] ${
                  formData.civility === civ 
                    ? 'border-orange-700 bg-orange-50 text-ujlog-primary-dark shadow-2xs' 
                    : 'border-ujlog-border bg-ujlog-cream text-ujlog-ink-soft hover:bg-white'
                }`}
              >
                {civ === 'Monsieur' ? 'M.' : civ === 'Madame' ? 'Mme' : 'Mlle'}
              </button>
            ))}
          </div>
        </div>

        {/* Names Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">Nom</label>
            <input
              type="text"
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-ujlog-border bg-ujlog-cream focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-700 transition-all font-medium text-ujlog-ink"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">Prénom(s)</label>
            <input
              type="text"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-ujlog-border bg-ujlog-cream focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-700 transition-all font-medium text-ujlog-ink"
            />
          </div>
        </div>

        {/* Contact & Student ID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">Adresse e-mail</label>
            <div className="relative">
              <input
                type="email"
                value={formData.email}
                readOnly
                disabled
                className="w-full px-3 py-2.5 pl-9 text-xs sm:text-sm rounded-xl border border-ujlog-border bg-ujlog-cream/60 text-ujlog-ink-soft cursor-not-allowed font-medium"
              />
              <Mail className="w-3.5 h-3.5 text-ujlog-ink-soft/60 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">Numéro de carte étudiant / ID</label>
            <div className="relative">
              <input
                type="text"
                value={formData.studentId}
                readOnly
                disabled
                className="w-full px-3 py-2.5 pl-9 text-xs sm:text-sm rounded-xl border border-ujlog-border bg-ujlog-cream/60 text-ujlog-ink-soft cursor-not-allowed font-medium"
              />
              <IdCard className="w-3.5 h-3.5 text-ujlog-ink-soft/60 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        {/* Progression académique — un étudiant ne choisit jamais librement son niveau ;
            il ne peut qu'avancer d'un seul palier à la fois via cette action contrôlée
            (voir migration 0003 + app/api/student/advance-level). */}
        <div className="flex items-center justify-between -mb-1">
          <p className="text-[10px] text-ujlog-ink-soft/70 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Niveau et filière gérés par votre progression académique.
          </p>
          {nextLevelCode && (
            <button
              type="button"
              onClick={() => {
                setSelectedOptionCode('');
                setAdvanceError('');
                setAdvanceSuccess(false);
                setIsAdvanceModalOpen(true);
              }}
              className="text-[11px] font-bold text-ujlog-primary-dark hover:underline cursor-pointer"
            >
              Passer au niveau supérieur →
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">Niveau d&apos;études</label>
            <div className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-ujlog-border bg-ujlog-cream/60 text-ujlog-ink-soft font-medium">
              {formData.level}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">Filière / Spécialité</label>
            <div className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-ujlog-border bg-ujlog-cream/60 text-ujlog-ink-soft font-medium">
              {formData.field}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">Année académique</label>
            <select
              value={formData.academicYear}
              onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
              className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-ujlog-border bg-ujlog-cream focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-700 transition-all font-medium text-ujlog-ink"
            >
              <option value="2026-2027">2026-2027</option>
              <option value="2027-2028">2027-2028</option>
              <option value="2028-2029">2028-2029</option>
            </select>
          </div>
        </div>

        {/* Institution details (Read-only) */}
        <div className="bg-ujlog-cream rounded-xl p-3.5 border border-ujlog-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-ujlog-ink-soft">
            <Building2 className="w-4 h-4 text-ujlog-primary-dark shrink-0" />
            <span className="font-semibold">Université Jean Lorougnon Guédé • Daloa (Côte d&apos;Ivoire)</span>
          </div>
          <span className="text-[11px] text-ujlog-ink-soft/60 font-medium">UFR Sciences Sociales</span>
        </div>

        {/* Save button & Password trigger */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsPasswordModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-ujlog-cream hover:bg-ujlog-border text-ujlog-ink-soft font-bold text-xs rounded-xl transition-colors cursor-pointer min-h-[42px]"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Modifier mon mot de passe</span>
          </button>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 bg-terracotta-gradient text-white font-bold text-xs px-5 py-2.5 rounded-2xl shadow-glow-orange hover:brightness-110 transition-all cursor-pointer min-h-[42px]"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Enregistrer les modifications</span>
          </button>
        </div>

      </form>

      {/* Password Change Modal with Strength Meter */}
      <AnimatePresence>
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-2xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-ujlog-border space-y-4"
            >
              <div className="flex items-center justify-between border-b border-ujlog-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-ujlog-primary-dark flex items-center justify-center">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ujlog-ink">Changer de mot de passe</h3>
                    <p className="text-[11px] text-ujlog-ink-soft">8 caractères min, majuscule, minuscule, chiffre</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="text-ujlog-ink-soft/60 hover:text-ujlog-ink-soft p-1.5 rounded-lg"
                >
                  ✕
                </button>
              </div>

              {passwordError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium border border-red-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 bg-orange-50 text-ujlog-primary-dark rounded-xl border border-orange-200 text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-orange-700 shrink-0" />
                  <span>Mot de passe mis à jour avec succès !</span>
                </div>
              )}

              <form onSubmit={handlePasswordUpdate} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">
                    Mot de passe actuel
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Votre mot de passe actuel"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-ujlog-border bg-ujlog-cream text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-700 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ujlog-ink-soft/60 hover:text-ujlog-ink-soft p-1"
                    >
                      {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Entrez votre nouveau mot de passe"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-ujlog-border bg-ujlog-cream text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-700 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ujlog-ink-soft/60 hover:text-ujlog-ink-soft p-1"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Live Password Strength Meter */}
                <PasswordStrengthMeter password={newPassword} />

                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">
                    Confirmer le nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirmez votre nouveau mot de passe"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-ujlog-border bg-ujlog-cream text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-700 transition-all"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isUpdatingPassword}
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-ujlog-ink-soft hover:bg-ujlog-cream transition-colors disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-terracotta-gradient text-white hover:brightness-110 transition-colors flex items-center gap-1.5 disabled:opacity-70 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isUpdatingPassword ? 'Mise à jour...' : 'Sauvegarder'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modale "Passer au niveau supérieur" */}
      <AnimatePresence>
        {isAdvanceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ujlog-ink/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-ujlog-border shadow-card-hover p-6 max-w-sm w-full"
            >
              {advanceSuccess ? (
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 mx-auto bg-ujlog-secondary-50 text-ujlog-secondary rounded-2xl flex items-center justify-center border border-ujlog-secondary-100">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="font-display text-base font-bold text-ujlog-ink">
                    Félicitations, vous êtes en {nextLevelLabel} !
                  </h3>
                  <p className="text-xs text-ujlog-ink-soft leading-relaxed">
                    Vos cours ont été mis à jour. Vous ne recevrez plus les publications de votre ancien niveau.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdvanceModalOpen(false);
                      window.location.reload();
                    }}
                    className="w-full py-2.5 bg-ujlog-primary-dark text-white font-bold text-xs rounded-xl hover:brightness-105 transition-all cursor-pointer"
                  >
                    Continuer
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-display text-base font-bold text-ujlog-ink">
                      Passer en {nextLevelLabel} ?
                    </h3>
                    <p className="text-xs text-ujlog-ink-soft leading-relaxed">
                      Cette action est définitive pour l&apos;année en cours : vous perdrez l&apos;accès aux cours de {formData.level} et recevrez ceux de {nextLevelLabel}.
                    </p>
                  </div>

                  {nextRequiresOption && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider block">
                        Sélectionnez votre option
                      </label>
                      <select
                        value={selectedOptionCode}
                        onChange={(e) => setSelectedOptionCode(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-ujlog-border bg-ujlog-cream text-ujlog-ink font-medium focus:outline-none focus:ring-2 focus:ring-ujlog-primary/20"
                      >
                        <option value="">Choisir une option...</option>
                        {OPTION_FIELD_CODES.map((code) => (
                          <option key={code} value={code}>{FIELD_CODE_TO_LABEL[code]}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {advanceError && (
                    <p className="text-[11px] text-red-600 font-semibold bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                      {advanceError}
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAdvanceLevel}
                      disabled={isAdvancing}
                      className="flex-1 py-2.5 bg-ujlog-primary-dark text-white font-bold text-xs rounded-xl hover:brightness-105 transition-all cursor-pointer disabled:opacity-60"
                    >
                      {isAdvancing ? 'Application...' : 'Confirmer'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAdvanceModalOpen(false)}
                      className="py-2.5 px-4 bg-ujlog-cream border border-ujlog-border text-ujlog-ink-soft font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
