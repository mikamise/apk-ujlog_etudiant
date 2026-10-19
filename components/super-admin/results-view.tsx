'use client';

import { useState } from 'react';
import { GraduationCap, Search, Download, CheckCircle2, FileText } from 'lucide-react';
import { AcademicResultItem } from '@/lib/admin-types';

interface ResultsViewProps {
  results: AcademicResultItem[];
}

export function ResultsView({ results }: ResultsViewProps) {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');

  const filtered = results.filter((r) => {
    const matchSearch =
      !search ||
      r.titre.toLowerCase().includes(search.toLowerCase()) ||
      r.matiere.toLowerCase().includes(search.toLowerCase()) ||
      r.authorName.toLowerCase().includes(search.toLowerCase());

    const matchLevel = !levelFilter || r.niveau === levelFilter;
    return matchSearch && matchLevel;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-ujlog-secondary uppercase tracking-wider mb-1">
            <GraduationCap className="w-4 h-4" />
            <span>Résultats & Évaluations</span>
          </div>
          <h1 className="font-display text-xl font-bold text-ujlog-ink tracking-tight">
            Procès-verbaux & notes
          </h1>
          <p className="text-xs text-ujlog-ink-soft/60">
            Consultez les PV d&apos;examens, contrôles continus et résultats validés transmis par le département.
          </p>
        </div>

        <span className="text-xs font-mono font-bold text-ujlog-secondary bg-white border border-ujlog-border px-3 py-1.5 rounded-xl">
          Total : {filtered.length} PV publiés
        </span>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white border border-ujlog-border rounded-3xl grid grid-cols-1 md:grid-cols-3 gap-3 shadow-soft-warm">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-ujlog-ink-soft absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par matière, titre de PV, délégué..."
            className="w-full pl-10 pr-3.5 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink placeholder-ujlog-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-green-500/40"
          />
        </div>

        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="px-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink focus:outline-none cursor-pointer"
        >
          <option value="">Tous les niveaux</option>
          <option value="Licence 1">Licence 1</option>
          <option value="Licence 2">Licence 2</option>
          <option value="Licence 3">Licence 3</option>
          <option value="Master 1">Master 1</option>
          <option value="Master 2">Master 2</option>
        </select>
      </div>

      {/* Results List */}
      <div className="bg-white border border-ujlog-border rounded-3xl overflow-hidden shadow-soft-warm">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-ujlog-ink-soft space-y-2">
            <GraduationCap className="w-8 h-8 text-ujlog-ink-soft mx-auto" />
            <p className="font-bold text-ujlog-ink-soft/60">Aucun résultat trouvé</p>
          </div>
        ) : (
          <div className="divide-y divide-ujlog-border/60">
            {filtered.map((r) => (
              <div key={r.id} className="p-4 hover:bg-ujlog-cream/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-ujlog-cream border border-ujlog-border rounded-2xl text-ujlog-secondary font-bold shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-ujlog-secondary-50 border border-ujlog-secondary-100 text-ujlog-secondary font-bold text-[10px] rounded-full">
                        {r.type}
                      </span>
                      <h4 className="font-bold text-ujlog-ink text-sm">{r.titre}</h4>
                    </div>
                    <p className="text-ujlog-primary font-bold">{r.matiere}</p>
                    <p className="text-[10px] text-ujlog-ink-soft/60">
                      {r.niveau} • {r.section} • Semestre {r.semestre} • Taux réussite : {r.tauxReussite}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-ujlog-border pt-2 md:pt-0">
                  <div className="text-right">
                    <p className="text-[10px] text-ujlog-ink-soft/60">Publié par <span className="text-ujlog-ink font-bold">{r.authorName}</span></p>
                    <p className="text-[10px] font-mono text-ujlog-ink-soft">{new Date(r.datePublication).toLocaleDateString('fr-FR')}</p>
                  </div>

                  <a
                    href={r.documentUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-orange-800 hover:bg-orange-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-orange-200" />
                    <span>Consulter le PV</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
