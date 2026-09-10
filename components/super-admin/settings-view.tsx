'use client';

import { useState } from 'react';
import { Settings, ShieldCheck, Database, KeyRound, CheckCircle2 } from 'lucide-react';

export function SettingsView() {
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [sessionTimeout, setSessionTimeout] = useState('8');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-ujlog-secondary uppercase tracking-wider mb-1">
          <Settings className="w-4 h-4" />
          <span>Configuration Plateforme</span>
        </div>
        <h1 className="font-display text-xl font-bold text-ujlog-ink tracking-tight">
          Paramètres système & sécurité
        </h1>
        <p className="text-xs text-ujlog-ink-soft/60">
          Gestion de l&apos;année académique, des politiques de session et réinitialisation globale des données.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-ujlog-primary-light border border-ujlog-primary/20 rounded-2xl flex items-center gap-3 text-xs text-ujlog-primary-dark">
          <CheckCircle2 className="w-5 h-5 text-ujlog-primary shrink-0" />
          <span>Paramètres d&apos;administration enregistrés avec succès.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Academic Settings */}
        <div className="p-5 bg-white border border-ujlog-border rounded-3xl space-y-4 shadow-soft-warm text-ujlog-ink">
          <div className="flex items-center gap-2 border-b border-ujlog-border pb-3">
            <Database className="w-4 h-4 text-ujlog-primary" />
            <h3 className="text-xs font-black uppercase text-ujlog-ink tracking-wider">
              Paramètres Académiques
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="block text-ujlog-ink-soft font-bold">Année universitaire active</label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink"
              />
            </div>

            <div className="p-3 bg-ujlog-cream rounded-2xl border border-ujlog-border space-y-1">
              <span className="font-bold text-ujlog-primary text-xs block">Département de Géographie</span>
              <p className="text-[11px] text-ujlog-ink-soft/60">
                UFR des Sciences Sociales  -  Université Jean Lorougnon Guédé (UJLOG), Daloa.
              </p>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="p-5 bg-white border border-ujlog-border rounded-3xl space-y-4 shadow-soft-warm text-ujlog-ink">
          <div className="flex items-center gap-2 border-b border-ujlog-border pb-3">
            <ShieldCheck className="w-4 h-4 text-ujlog-secondary" />
            <h3 className="text-xs font-black uppercase text-ujlog-ink tracking-wider">
              Sécurité & Sessions
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="block text-ujlog-ink-soft font-bold">Durée d&apos;expiration des sessions (heures)</label>
              <select
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="w-full px-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink"
              >
                <option value="2">2 heures</option>
                <option value="8">8 heures (Recommandé)</option>
                <option value="24">24 heures</option>
              </select>
            </div>

            <div className="p-3 bg-ujlog-cream rounded-2xl border border-ujlog-border space-y-1">
              <span className="font-bold text-ujlog-secondary text-xs block">Contrôle Strict Serveur</span>
              <p className="text-[11px] text-ujlog-ink-soft/60">
                Statut : <strong className="text-ujlog-ink font-mono">Compte Super Administrateur Actif</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 pt-2">
          <button
            type="submit"
            className="py-3 px-6 bg-orange-700 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-soft-warm cursor-pointer transition-all"
          >
            Enregistrer les modifications
          </button>
        </div>
      </form>

    </div>
  );
}
