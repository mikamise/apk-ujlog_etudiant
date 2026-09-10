'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  Archive, 
  Search, 
  BookOpen, 
  Download, 
  Calendar, 
  Filter, 
  Layers, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  GraduationCap,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { DelegateCourse } from '@/lib/delegate-types';

interface ArchivedCourse {
  id: string;
  titre?: string;
  title?: string;
  description?: string;
  matiere?: string;
  enseignant?: string;
  teacherName?: string;
  annee?: string;
  academicYearId?: string;
  niveau?: string;
  niveauCode?: string;
  levelCode?: string;
  type?: string;
  semestre?: string;
  fileName?: string;
  fileSize?: string;
  [key: string]: unknown;
}

export default function StudentArchivesPage() {
  const [selectedYear, setSelectedYear] = useState<string>('2026-2027');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);
  const [academicYears, setAcademicYears] = useState<string[]>(['2026-2027', '2025-2026', '2024-2025']);
  const [allCourses, setAllCourses] = useState<ArchivedCourse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    fetch('/api/academic-years')
      .then((res) => res.json())
      .then((payload) => {
        if (active && payload.success && Array.isArray(payload.data?.years)) {
          const list = payload.data.years.map((y: { id: string }) => y.id);
          setAcademicYears(list);
          if (payload.data.activeYear) {
            setSelectedYear(payload.data.activeYear);
          }
        }
      })
      .catch(() => {
        // safe fallback
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch(`/api/courses?academicYear=${encodeURIComponent(selectedYear)}&limit=100`)
      .then((res) => res.json())
      .then((payload) => {
        if (active) {
          setAllCourses(payload.success && Array.isArray(payload.data) ? payload.data : []);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          // Aucune donnée fictive : liste vide en cas d'échec réseau.
          setAllCourses([]);
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedYear]);

  // Filter archived courses by selected year, level, type, query
  const filteredCourses = useMemo(() => {
    return allCourses.filter((course) => {
      const courseYear = course.annee || course.academicYearId || '2026-2027';
      if (courseYear !== selectedYear) return false;

      if (selectedLevel !== 'all' && course.niveau !== selectedLevel && course.niveauCode !== selectedLevel && course.levelCode !== selectedLevel) return false;
      if (selectedType !== 'all' && course.type !== selectedType) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (course.titre && course.titre.toLowerCase().includes(q)) ||
          (course.title && course.title.toLowerCase().includes(q)) ||
          (course.description && course.description.toLowerCase().includes(q)) ||
          (course.matiere && course.matiere.toLowerCase().includes(q)) ||
          (course.enseignant && course.enseignant.toLowerCase().includes(q)) ||
          (course.teacherName && course.teacherName.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [allCourses, selectedYear, selectedLevel, selectedType, searchQuery]);

  const handleDownload = async (course: ArchivedCourse) => {
    const title = course.titre || course.title;
    setDownloadSuccessMessage(`Téléchargement de « ${title} » débuté avec succès.`);
    try {
      await fetch(`/api/courses/${course.id}/download`, { method: 'POST' });
    } catch {
      // safe fallback
    }
    setTimeout(() => setDownloadSuccessMessage(null), 4000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">
      {/* HERO BANNER */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-terracotta-gradient rounded-[28px] p-6 sm:p-8 text-white shadow-glow-orange relative overflow-hidden"
      >
        <svg className="absolute -top-16 -right-20 w-80 h-80 opacity-30 pointer-events-none" viewBox="0 0 480 480" fill="none">
          <circle cx="300" cy="150" r="90" stroke="rgba(255,247,237,0.3)" strokeWidth="1.5" />
          <circle cx="300" cy="150" r="140" stroke="rgba(255,247,237,0.2)" strokeWidth="1.5" />
          <circle cx="300" cy="150" r="190" stroke="rgba(255,247,237,0.12)" strokeWidth="1.5" />
        </svg>
        <div className="absolute right-16 -bottom-10 w-44 h-44 bg-green-400/25 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/14 backdrop-blur-md rounded-full border border-white/25 text-[10px] font-bold text-orange-50 uppercase tracking-widest">
            <Archive className="w-3.5 h-3.5 text-green-200" />
            <span>Dépôt National d&apos;Archives Pédagogiques UJLOG</span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-orange-50 tracking-tight">
            Archives des Années Universitaires
          </h1>
          <p className="text-xs text-orange-50/85 leading-relaxed max-w-3xl font-normal">
            Consultez et téléchargez les cours, travaux dirigés (TD), annales d&apos;examens et résultats des promotions précédentes. Toutes les ressources pédagogiques sont conservées indéfiniment à titre d&apos;archive.
          </p>
        </div>
      </motion.div>

      {downloadSuccessMessage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 bg-orange-50 border border-orange-200 rounded-2xl flex items-center justify-between text-ujlog-primary-dark text-xs shadow-2xs"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-orange-700 shrink-0" />
            <span className="font-bold">{downloadSuccessMessage}</span>
          </div>
          <button onClick={() => setDownloadSuccessMessage(null)} className="font-bold text-ujlog-primary-dark hover:underline">
            Fermer
          </button>
        </motion.div>
      )}

      {/* FILTER BAR & SELECTION - CLICK TO SELECT YEARS & LEVELS */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-ujlog-border/90 shadow-2xs space-y-5">
        
        {/* YEAR SELECTION - CLICKABLE BUTTONS / CARDS LIKE LEVELS */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-ujlog-ink-soft flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-green-600" />
              <span>1. Choisir l&apos;Année Universitaire</span>
            </span>
            <span className="text-[10px] font-bold text-ujlog-ink-soft/60">Cliquez pour sélectionner</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {academicYears.map((yr) => {
              const isSelected = selectedYear === yr;
              return (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYear(yr)}
                  className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-green-gradient text-white border-transparent shadow-glow-green ring-2 ring-green-400/30'
                      : 'bg-ujlog-cream hover:bg-ujlog-cream/80 text-ujlog-ink border-ujlog-border'
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className={`text-[9px] font-bold uppercase tracking-wider block ${isSelected ? 'text-green-100' : 'text-ujlog-ink-soft'}`}>
                      Session Académique
                    </span>
                    <span className="text-xs sm:text-sm font-black block tracking-tight">
                      {yr}
                    </span>
                  </div>
                  {isSelected ? (
                    <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-ujlog-border shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* LEVEL SELECTION - CLICKABLE PILLS / BUTTONS */}
        <div className="space-y-2.5 pt-2 border-t border-ujlog-border">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-ujlog-ink-soft flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-orange-700" />
              <span>2. Filtrer par Niveau d&apos;Études</span>
            </span>
            {selectedLevel !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedLevel('all')}
                className="text-[10px] font-bold text-orange-700 hover:underline"
              >
                Réinitialiser (Tous)
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { id: 'all', label: 'Tous les niveaux' },
              { id: 'Licence 1', label: 'Licence 1 (L1)' },
              { id: 'Licence 2', label: 'Licence 2 (L2)' },
              { id: 'Licence 3', label: 'Licence 3 (L3)' },
              { id: 'Master 1', label: 'Master 1 (M1)' },
              { id: 'Master 2', label: 'Master 2 (M2)' },
            ].map((lvl) => {
              const isSelected = selectedLevel === lvl.id;
              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setSelectedLevel(lvl.id)}
                  className={`py-2.5 px-3 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-terracotta-gradient text-white border-transparent shadow-glow-orange ring-2 ring-orange-400/30'
                      : 'bg-ujlog-cream hover:bg-ujlog-cream text-ujlog-ink-soft border-ujlog-border'
                  }`}
                >
                  {lvl.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* SEARCH & DOCUMENT TYPE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-ujlog-border">
          <div className="relative">
            <Search className="w-4 h-4 text-ujlog-ink-soft/60 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par titre, matière, enseignant..."
              className="w-full pl-9 pr-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-500/30"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs font-bold text-ujlog-ink focus:outline-none cursor-pointer"
          >
            <option value="all">Tous les types de documents (CM, TD, Examens...)</option>
            <option value="CM">Cours Magistral (CM)</option>
            <option value="TD">Travaux Dirigés (TD)</option>
            <option value="Résultats de TD">Résultats de TD</option>
            <option value="Résultats d'examen">Résultats d&apos;examen</option>
            <option value="Sujets d'examen">Sujets d&apos;examen</option>
          </select>
        </div>
      </div>

      {/* ARCHIVED LIST RESULTS */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-ujlog-border/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-ujlog-border">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-green-700" />
            <h2 className="text-sm font-extrabold text-ujlog-ink">
              Documents archivés  -  Session {selectedYear} ({filteredCourses.length})
            </h2>
          </div>
          <span className="text-[10px] font-bold text-green-800 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
            Lecture seule & Téléchargement
          </span>
        </div>

        <div className="divide-y divide-ujlog-border">
          {filteredCourses.length === 0 ? (
            <div className="py-12 text-center text-ujlog-ink-soft/60 space-y-3">
              <Archive className="w-10 h-10 mx-auto text-ujlog-ink-soft/40" />
              <p className="text-xs font-bold text-ujlog-ink-soft">
                Aucun document d&apos;archive disponible pour cette sélection ({selectedYear}).
              </p>
              <p className="text-[11px] text-ujlog-ink-soft/60 max-w-sm mx-auto">
                Essayez de réinitialiser vos filtres ou de sélectionner une autre année universitaire.
              </p>
            </div>
          ) : (
            filteredCourses.map((course) => (
              <div key={course.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-ujlog-cream/60 p-2.5 rounded-2xl transition-colors">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-green-100 text-green-900 border border-green-200">
                      Archive {course.annee || selectedYear}
                    </span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-ujlog-cream text-ujlog-ink-soft border border-ujlog-border">
                      {course.type}
                    </span>
                    <span className="text-[10px] font-bold text-ujlog-ink-soft">
                      {course.niveau} • {course.matiere} • Semestre {course.semestre}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-ujlog-ink truncate">{course.titre}</h3>
                  <p className="text-[11px] text-ujlog-ink-soft line-clamp-1">{course.description}</p>

                  <div className="flex items-center gap-3 text-[10px] text-ujlog-ink-soft/60 pt-0.5">
                    <span>Enseignant : {course.enseignant || 'Équipe pédagogique'}</span>
                    <span>•</span>
                    <span>{course.fileName || 'document_archive.pdf'} ({course.fileSize || '2.4 Mo'})</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDownload(course)}
                    className="px-3.5 py-2 bg-terracotta-gradient hover:brightness-110 text-white font-extrabold text-xs rounded-xl shadow-glow-orange transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
