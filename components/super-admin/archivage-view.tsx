'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Archive,
  Calendar,
  CheckCircle2,
  PlusCircle,
  AlertTriangle,
  Lock,
  Clock,
  FileText,
} from 'lucide-react';
import { motion } from 'motion/react';
import { AdminStore } from '@/lib/admin-store';

interface ArchivedSession {
  id: string;
  academicYear: string;
  archivedAt: string;
  archivedBy: string;
  coursesCount: number;
  studentsCount: number;
  description: string;
}

export function ArchivageView() {
  const [activeYear, setActiveYear] = useState<string>('');
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [archivedSessions, setArchivedSessions] = useState<ArchivedSession[]>([]);
  const [activeYearCoursesCount, setActiveYearCoursesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [nextYearInput, setNextYearInput] = useState('');
  const [showAddYearModal, setShowAddYearModal] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');
  const [archiveSuccessMessage, setArchiveSuccessMessage] = useState<string | null>(null);

  const parseYearRange = (label: string): { startYear: number; endYear: number } | null => {
    const match = label.trim().match(/^(\d{4})-(\d{4})$/);
    if (!match) return null;
    return { startYear: Number(match[1]), endYear: Number(match[2]) };
  };

  const reloadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [yearsRes, logsRes] = await Promise.all([
        fetch('/api/academic-years').then((r) => r.json()),
        fetch('/api/admin/activity?limit=50').then((r) => r.json()),
      ]);

      const years: Array<{ id: string; status: string; start_year: number }> =
        yearsRes.success && Array.isArray(yearsRes.data) ? yearsRes.data : [];

      const active = years.find((y) => y.status === 'active');
      const archived = years.filter((y) => y.status === 'archived');

      const archivedByEntity: Record<string, string> = {};
      const logs = logsRes.success && Array.isArray(logsRes.data?.logs) ? logsRes.data.logs : [];
      for (const log of logs) {
        if (log.action === 'ACADEMIC_YEAR_ARCHIVED' && log.entity_id) {
          archivedByEntity[log.entity_id] = log.user_email || 'Administration';
        }
      }

      const sessions: ArchivedSession[] = await Promise.all(
        archived.map(async (y): Promise<ArchivedSession> => {
          const reportRes = await fetch(`/api/admin/archive?academicYearId=${encodeURIComponent(y.id)}`).then((r) => r.json());
          const report = reportRes.success ? reportRes.data : null;
          return {
            id: y.id,
            academicYear: y.id,
            archivedAt: '',
            archivedBy: archivedByEntity[y.id] || 'Administration UJLOG',
            coursesCount: report?.coursesCount ?? 0,
            studentsCount: report?.studentsCount ?? 0,
            description: `Session académique ${y.id}, conservée intégralement.`,
          };
        })
      );

      setActiveYear(active?.id || '');
      setAcademicYears(years.map((y) => y.id));
      setArchivedSessions(sessions);

      if (active?.id) {
        const coursesRes = await fetch(`/api/courses?academicYear=${encodeURIComponent(active.id)}&limit=1`).then((r) => r.json());
        setActiveYearCoursesCount(coursesRes.meta?.total ?? 0);
      } else {
        setActiveYearCoursesCount(0);
      }
    } catch {
      // Aucune donnée fictive en cas d'échec réseau : listes vides, états honnêtes.
      setActiveYear('');
      setAcademicYears([]);
      setArchivedSessions([]);
      setActiveYearCoursesCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reloadData();
  }, [reloadData]);

  const handleRunArchiving = async () => {
    const parsed = parseYearRange(nextYearInput);
    if (!parsed) return;

    await AdminStore.runAnnualArchiving(activeYear);
    await AdminStore.addAcademicYear(nextYearInput.trim(), parsed.startYear, parsed.endYear);

    setArchiveSuccessMessage(`L'année ${activeYear} a été archivée avec succès. L'année active est maintenant ${nextYearInput.trim()}.`);
    setShowArchiveModal(false);
    reloadData();
  };

  const handleAddYear = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseYearRange(newYearInput);
    if (!parsed) return;
    await AdminStore.addAcademicYear(newYearInput.trim(), parsed.startYear, parsed.endYear);
    setShowAddYearModal(false);
    setNewYearInput('');
    reloadData();
  };

  const allCoursesCount = activeYearCoursesCount;

  if (isLoading) {
    return <div className="p-8 text-center text-xs text-ujlog-ink-soft">Chargement des données d&apos;archivage…</div>;
  }


  return (
    <div className="space-y-6">
      {/* HEADER HERO */}
      <div className="bg-ujlog-primary-dark rounded-3xl p-6 sm:p-8 text-white border border-ujlog-primary/20 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/20 backdrop-blur-md rounded-full border border-orange-400/30 text-[10px] font-bold text-orange-200 uppercase tracking-widest">
              <Archive className="w-3.5 h-3.5 text-green-300" />
              <span>Gestion des Années Universitaires & Archives</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Archivage Annuel & Conservation Pédagogique
            </h1>
            <p className="text-xs text-orange-100/90 leading-relaxed font-normal">
              Chaque année universitaire possède ses ressources propres. L&apos;archivage ne supprime JAMAIS aucune donnée. Les cours et relevés sont transférés dans l&apos;Espace Archives accessibles aux étudiants et administrateurs.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowArchiveModal(true)}
              className="px-4 py-2.5 bg-green-500 hover:bg-green-400 text-ujlog-ink font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Archive className="w-4 h-4" />
              <span>Lancer l&apos;archivage annuel</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddYearModal(true)}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-orange-200" />
              <span>Nouvelle année</span>
            </button>
          </div>
        </div>
      </div>

      {archiveSuccessMessage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-orange-50 border border-orange-200 rounded-2xl flex items-center justify-between gap-3 text-ujlog-primary-dark text-xs shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-orange-700 shrink-0" />
            <span className="font-bold">{archiveSuccessMessage}</span>
          </div>
          <button
            onClick={() => setArchiveSuccessMessage(null)}
            className="text-xs font-bold text-ujlog-primary-dark hover:underline cursor-pointer"
          >
            Fermer
          </button>
        </motion.div>
      )}

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-ujlog-border shadow-soft-warm space-y-2">
          <span className="text-[10px] uppercase font-bold text-ujlog-ink-soft/60 block tracking-wider">
            Année Universitaire Active
          </span>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-black text-ujlog-primary-dark">{activeYear}</p>
            <span className="px-2.5 py-1 bg-orange-100 text-ujlog-primary-dark text-[10px] font-extrabold rounded-full border border-orange-200">
              En cours
            </span>
          </div>
          <p className="text-[11px] text-ujlog-ink-soft font-medium">Session en cours de saisie et diffusion</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-ujlog-border shadow-soft-warm space-y-2">
          <span className="text-[10px] uppercase font-bold text-ujlog-ink-soft/60 block tracking-wider">
            Sessions Archivées
          </span>
          <p className="text-2xl font-black text-green-800">{archivedSessions.length}</p>
          <p className="text-[11px] text-ujlog-ink-soft font-medium">Disponibles en consultation permanente</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-ujlog-border shadow-soft-warm space-y-2">
          <span className="text-[10px] uppercase font-bold text-ujlog-ink-soft/60 block tracking-wider">
            Ressources de l&apos;année {activeYear}
          </span>
          <p className="text-2xl font-black text-ujlog-ink">{allCoursesCount}</p>
          <p className="text-[11px] text-ujlog-ink-soft font-medium">Cours, TD, résultats enregistrés</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-ujlog-border shadow-soft-warm space-y-2">
          <span className="text-[10px] uppercase font-bold text-ujlog-ink-soft/60 block tracking-wider">
            Garantie d&apos;Intégrité
          </span>
          <div className="flex items-center gap-1.5 text-ujlog-primary-dark font-bold text-xs">
            <Lock className="w-4 h-4 text-orange-700" />
            <span>Conservation Indéfinie</span>
          </div>
          <p className="text-[11px] text-ujlog-ink-soft font-medium">Aucune donnée n&apos;est jamais supprimée</p>
        </div>
      </div>

      {/* TABLE OF ARCHIVED SESSIONS */}
      <div className="bg-white rounded-3xl p-6 border border-ujlog-border shadow-soft-warm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-ujlog-border">
          <div>
            <h2 className="text-base font-extrabold text-ujlog-ink flex items-center gap-2">
              <Archive className="w-5 h-5 text-green-700" />
              <span>Espace Archives Académiques</span>
            </h2>
            <p className="text-xs text-ujlog-ink-soft mt-0.5">
              Historique complet des sessions universitaires archivées et leurs statistiques.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-ujlog-ink-soft">Sélecteur d&apos;année active :</span>
            <select
              value={activeYear}
              onChange={() => { /* Le changement d’année active se fait via l’archivage officiel, pas ce sélecteur. */ }}
              disabled
              className="px-3 py-1.5 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs font-extrabold text-ujlog-primary-dark focus:outline-none"
            >
              {academicYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr} {yr === activeYear ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="divide-y divide-stone-100">
          {archivedSessions.map((session) => (
            <div key={session.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-ujlog-cream/60 p-3 rounded-2xl transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-green-900 px-2.5 py-1 bg-green-100 border border-green-200 rounded-lg">
                    Année {session.academicYear}
                  </span>
                  <span className="text-[11px] text-ujlog-ink-soft font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-ujlog-ink-soft/60" />
                    Archivé le {new Date(session.archivedAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <p className="text-xs text-ujlog-ink-soft font-medium pt-1">{session.description}</p>
                <div className="flex items-center gap-4 text-[11px] text-ujlog-ink-soft pt-1">
                  <span><strong>{session.coursesCount}</strong> documents pédagogiques</span>
                  <span>•</span>
                  <span><strong>{session.studentsCount}</strong> étudiants rattachés</span>
                  <span>•</span>
                  <span>Par <strong>{session.archivedBy}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="/dashboard/archives"
                  className="px-3.5 py-2 bg-orange-50 hover:bg-orange-100 text-ujlog-primary-dark font-bold text-xs rounded-xl border border-orange-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-orange-700" />
                  <span>Consulter l&apos;espace étudiant</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL: RUN ANNUAL ARCHIVING */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 bg-white/60 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-ujlog-border rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 border border-green-200 rounded-2xl text-green-800">
                <Archive className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-ujlog-ink uppercase">Clôture & Archivage Annuel</h3>
                <p className="text-xs text-ujlog-ink-soft">Procédure officielle de passage d&apos;année universitaire</p>
              </div>
            </div>

            <div className="p-4 bg-green-50 border border-green-200/80 rounded-2xl space-y-2 text-xs text-green-950">
              <div className="flex items-center gap-2 font-bold text-green-900">
                <AlertTriangle className="w-4 h-4 text-green-700 shrink-0" />
                <span>Rappel des Règles d&apos;Archivage :</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed text-green-900/90 font-medium">
                <li>L&apos;archivage ne supprime <strong>JAMAIS</strong> aucune donnée ni aucun cours.</li>
                <li>Toutes les ressources de l&apos;année <strong>{activeYear}</strong> sont verrouillées et déplacées dans l&apos;Espace Archives.</li>
                <li>Une nouvelle session propre pour l&apos;année universitaire suivante est immédiatement initialisée.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-ujlog-ink">
                Nouvelle Année Universitaire à ouvrir :
              </label>
              <input
                type="text"
                required
                value={nextYearInput}
                onChange={(e) => setNextYearInput(e.target.value)}
                placeholder="Ex: 2027-2028"
                className="w-full px-3.5 py-2.5 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs font-bold text-ujlog-ink focus:outline-none focus:ring-2 focus:ring-green-500/40"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-ujlog-border">
              <button
                type="button"
                onClick={() => setShowArchiveModal(false)}
                className="px-4 py-2.5 bg-ujlog-cream hover:bg-ujlog-border text-ujlog-ink-soft font-bold text-xs rounded-xl cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleRunArchiving}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Archive className="w-4 h-4" />
                <span>Confirmer & Archiver {activeYear}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL: ADD ACADEMIC YEAR */}
      {showAddYearModal && (
        <div className="fixed inset-0 z-50 bg-white/60 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-ujlog-border rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-100 border border-orange-200 rounded-xl text-ujlog-primary-dark">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ujlog-ink uppercase">Ajouter une Année Universitaire</h3>
                <p className="text-[11px] text-ujlog-ink-soft">Saisie manuelle d&apos;une session</p>
              </div>
            </div>

            <form onSubmit={handleAddYear} className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-ujlog-ink">
                  Libellé de l&apos;année (Format: AAAA-AAAA)
                </label>
                <input
                  type="text"
                  required
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  placeholder="Ex: 2027-2028"
                  className="w-full px-3.5 py-2.5 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs font-bold text-ujlog-ink focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddYearModal(false)}
                  className="px-3.5 py-2 bg-ujlog-cream hover:bg-ujlog-border text-ujlog-ink-soft font-bold text-xs rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-800 hover:bg-orange-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Créer l&apos;année
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
