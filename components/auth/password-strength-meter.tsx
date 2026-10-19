'use client';

import { Check, X, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export interface PasswordCriteriaStatus {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialOrLong: boolean;
  score: number; // 0 to 5
  levelLabel: 'Vide' | 'Très faible' | 'Faible' | 'Moyen' | 'Fort' | 'Très fort';
  isAllMandatoryMet: boolean;
}

export function evaluatePassword(password: string): PasswordCriteriaStatus {
  if (!password) {
    return {
      hasMinLength: false,
      hasUppercase: false,
      hasLowercase: false,
      hasNumber: false,
      hasSpecialOrLong: false,
      score: 0,
      levelLabel: 'Vide',
      isAllMandatoryMet: false,
    };
  }

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialOrLong = /[^A-Za-z0-9]/.test(password) || password.length >= 12;

  const isAllMandatoryMet = hasMinLength && hasUppercase && hasLowercase && hasNumber;

  let score = 0;
  if (hasMinLength) score++;
  if (hasUppercase) score++;
  if (hasLowercase) score++;
  if (hasNumber) score++;
  if (hasSpecialOrLong) score++;

  let levelLabel: PasswordCriteriaStatus['levelLabel'] = 'Très faible';
  if (score === 0) levelLabel = 'Vide';
  else if (score === 1) levelLabel = 'Très faible';
  else if (score === 2) levelLabel = 'Faible';
  else if (score === 3) levelLabel = 'Moyen';
  else if (score === 4 && isAllMandatoryMet) levelLabel = 'Fort';
  else if (score >= 5 && isAllMandatoryMet) levelLabel = 'Très fort';
  else levelLabel = 'Moyen';

  return {
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialOrLong,
    score,
    levelLabel,
    isAllMandatoryMet,
  };
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  const status = evaluatePassword(password);

  const getBarColor = (label: PasswordCriteriaStatus['levelLabel']) => {
    switch (label) {
      case 'Très faible':
        return 'bg-rose-500';
      case 'Faible':
        return 'bg-orange-500';
      case 'Moyen':
        return 'bg-green-500';
      case 'Fort':
        return 'bg-orange-600';
      case 'Très fort':
        return 'bg-orange-700';
      default:
        return 'bg-ujlog-border';
    }
  };

  const getBadgeStyle = (label: PasswordCriteriaStatus['levelLabel']) => {
    switch (label) {
      case 'Très faible':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Faible':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Moyen':
        return 'bg-green-50 text-green-800 border-green-200';
      case 'Fort':
        return 'bg-orange-50 text-ujlog-primary-dark border-orange-200';
      case 'Très fort':
        return 'bg-orange-100 text-ujlog-primary-dark border-orange-300 font-extrabold';
      default:
        return 'bg-ujlog-cream text-ujlog-ink-soft border-ujlog-border';
    }
  };

  const percent = status.score === 0 ? 0 : (status.score / 5) * 100;

  const criteriaList = [
    { label: '8 caractères minimum', met: status.hasMinLength, mandatory: true },
    { label: 'Une lettre majuscule (A-Z)', met: status.hasUppercase, mandatory: true },
    { label: 'Une lettre minuscule (a-z)', met: status.hasLowercase, mandatory: true },
    { label: 'Un chiffre obligatoire (0-9)', met: status.hasNumber, mandatory: true },
  ];

  return (
    <div className="space-y-2.5 pt-1">
      
      {/* Top Header with Label and Strength Meter */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-semibold text-ujlog-ink-soft flex items-center gap-1.5">
          {status.isAllMandatoryMet ? (
            <ShieldCheck className="w-3.5 h-3.5 text-orange-700" />
          ) : (
            <Shield className="w-3.5 h-3.5 text-ujlog-ink-soft/60" />
          )}
          <span>Force du mot de passe :</span>
        </span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${getBadgeStyle(status.levelLabel)}`}>
          {status.score === 0 ? 'À renseigner' : `MDP ${status.levelLabel}`}
        </span>
      </div>

      {/* Progress Bar with 5 Segments */}
      <div className="w-full bg-ujlog-cream rounded-full h-1.5 overflow-hidden flex gap-1 p-0.5 border border-ujlog-border/60">
        {[1, 2, 3, 4, 5].map((step) => {
          const isActive = status.score >= step;
          return (
            <div
              key={step}
              className={`h-full flex-1 rounded-full transition-all duration-300 ${
                isActive ? getBarColor(status.levelLabel) : 'bg-ujlog-border'
              }`}
            />
          );
        })}
      </div>

      {/* Mandatory Requirements Checklist */}
      <div className="bg-ujlog-cream/90 rounded-xl p-2.5 border border-ujlog-border space-y-1.5">
        <p className="text-[10px] font-bold text-ujlog-ink-soft uppercase tracking-wider">
          Critères obligatoires :
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {criteriaList.map((item, idx) => (
            <div 
              key={idx} 
              className={`flex items-center gap-1.5 text-[11px] transition-colors ${
                item.met ? 'text-ujlog-primary-dark font-semibold' : 'text-ujlog-ink-soft'
              }`}
            >
              <div 
                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[8px] transition-all ${
                  item.met 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-ujlog-border text-ujlog-ink-soft/60'
                }`}
              >
                {item.met ? <Check className="w-2.5 h-2.5" /> : '•'}
              </div>
              <span className="truncate">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
