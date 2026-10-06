'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { CourseItem, CourseResourceItemType, mapCourseRowToItem } from '@/lib/course-adapter';
import { useSavedCourses } from '@/hooks/use-saved-courses';
import { downloadCourseFile, getDownloadRecord, openOfflineFile, cancelDownload, type DownloadStatus } from '@/lib/offline-downloads';
import {
  ArrowLeft,
  Search,
  Bookmark,
  Download,
  Calendar,
  Layers,
  X,
  Check,
  Eye,
  GraduationCap,
  AlertCircle,
  ArrowRight,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const availableLevels = [
  { id: 'l1', name: 'Licence 1', type: 'direct', desc: 'Tronc commun L1' },
  { id: 'l2', name: 'Licence 2', type: 'direct', desc: 'Tronc commun L2' },
  { id: 'l3', name: 'Licence 3', type: 'choice', desc: 'Spécialisation L3' },
  { id: 'm1', name: 'Master 1', type: 'choice', desc: 'Cycle Master 1' },
  { id: 'm2', name: 'Master 2', type: 'choice', desc: 'Cycle Master 2' },
];

const RESOURCE_TYPES: { value: CourseResourceItemType; label: string }[] = [
  { value: 'CM', label: 'CM (Cours Magistral)' },
  { value: 'TD', label: 'TD (Travaux Dirigés)' },
  { value: 'Résultats de TD', label: 'Résultats de TD' },
  { value: 'Résultats d\'examen', label: 'Résultats d\'examen' },
  { value: 'Sujets d\'examen', label: 'Sujets d\'examen' },
];

function CoursesContent() {
  const searchParams = useSearchParams();
  const rawNiveau = searchParams?.get('niveau');
  const parcoursId = searchParams?.get('parcours');
  const openCourseId = searchParams?.get('open');

  const [activeTab, setActiveTab] = useState<number>(1);
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);
  const [downloadStates, setDownloadStates] = useState<Record<string, { status: DownloadStatus; progress: number; fileId?: string }>>({});
  const [coursesData, setCoursesData] = useState<CourseItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const { isSaved, toggleSave } = useSavedCourses();
  const [academicYears, setAcademicYears] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/academic-years')
      .then((res) => res.json())
      .then((payload) => {
        if (payload.success && Array.isArray(payload.data)) {
          setAcademicYears(payload.data.map((y: { id: string }) => y.id));
        }
      })
      .catch(() => setAcademicYears([]));
  }, []);


  const isTroncCommun = rawNiveau === 'l1' || rawNiveau === 'l2';

  // Arrivée depuis le lien "Voir le cours" d'une notification : ouvre
  // directement le détail du cours concerné une fois la liste chargée.
  useEffect(() => {
    if (!openCourseId || coursesData.length === 0) return;
    const match = coursesData.find((c) => c.id === openCourseId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (match) setSelectedCourse(match);
  }, [openCourseId, coursesData]);

  useEffect(() => {
    if (!rawNiveau) return;
    let active = true;

    const load = () => {
      const fieldParam = parcoursId ? `&field=${encodeURIComponent(parcoursId.replace('-', '_'))}` : '';
      fetch(`/api/courses?level=${encodeURIComponent(rawNiveau)}${fieldParam}&limit=100`)
        .then((res) => res.json())
        .then((payload) => {
          if (active) {
            const rawList = payload.success && Array.isArray(payload.data) ? payload.data : [];
            setCoursesData(rawList.map((row: Record<string, unknown>) => mapCourseRowToItem(row)));
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (active) {
            // Aucune donnée fictive : en cas d'échec réseau, la liste reste vide
            // et l'écran affiche l'état "Aucun cours disponible" prévu par l'UI.
            setCoursesData([]);
            setIsLoading(false);
          }
        });
    };

    load();
    const handleUpdate = () => {
      load();
    };
    window.addEventListener('ujlog_courses_updated', handleUpdate);
    return () => {
      active = false;
      window.removeEventListener('ujlog_courses_updated', handleUpdate);
    };
  }, [rawNiveau, parcoursId]);

  const filteredCourses = useMemo(() => {
    if (!rawNiveau) return [];
    return coursesData.filter((c) => {
      if (c.semestre !== activeTab) return false;
      if (isTroncCommun && subjectFilter !== 'all' && c.matiere !== subjectFilter) return false;
      if (typeFilter !== 'all' && c.type !== typeFilter) return false;
      if (yearFilter !== 'all' && c.annee !== yearFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = c.titre.toLowerCase().includes(q);
        const matchesDesc = c.description.toLowerCase().includes(q);
        const matchesProf = c.enseignant.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesProf) return false;
      }
      return true;
    });
  }, [rawNiveau, coursesData, activeTab, isTroncCommun, subjectFilter, typeFilter, yearFilter, searchQuery]);


  const handleDownload = async (course: CourseItem) => {
    try {
      const res = await fetch(`/api/courses/${course.id}/download`, { method: 'POST' });
      const payload = await res.json().catch(() => null);
      const files: { id: string; name: string; mimeType: string; url: string | null }[] = payload?.data?.files ?? [];
      const file = files.find((f) => f.url);

      if (!file) {
        setDownloadStates((prev) => ({ ...prev, [course.id]: { status: 'error', progress: 0 } }));
        return;
      }

      // Déjà disponible hors ligne sur cet appareil -> on l'ouvre directement, pas de re-téléchargement.
      const existing = await getDownloadRecord(file.id);
      if (existing?.status === 'downloaded') {
        await openOfflineFile(file.id);
        setDownloadStates((prev) => ({ ...prev, [course.id]: { status: 'downloaded', progress: 100, fileId: file.id } }));
        return;
      }

      setDownloadStates((prev) => ({ ...prev, [course.id]: { status: 'downloading', progress: 0, fileId: file.id } }));

      await downloadCourseFile(
        {
          courseId: course.id,
          fileId: file.id,
          fileUrl: file.url as string,
          fileName: file.name,
          mimeType: file.mimeType,
          title: course.titre,
        },
        (received, total) => {
          const progress = total ? Math.min(99, Math.round((received / total) * 100)) : 0;
          setDownloadStates((prev) => ({ ...prev, [course.id]: { status: 'downloading', progress, fileId: file.id } }));
        }
      );

      setDownloadStates((prev) => ({ ...prev, [course.id]: { status: 'downloaded', progress: 100, fileId: file.id } }));
      await openOfflineFile(file.id);
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === 'AbortError';
      setDownloadStates((prev) => ({
        ...prev,
        [course.id]: { status: isAbort ? 'not-downloaded' : 'error', progress: 0 },
      }));
    }
  };

  const handleCancelDownload = (course: CourseItem) => {
    const fileId = downloadStates[course.id]?.fileId;
    if (fileId) cancelDownload(fileId);
    setDownloadStates((prev) => ({ ...prev, [course.id]: { status: 'not-downloaded', progress: 0 } }));
  };

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'CM':
        return 'bg-orange-50 text-ujlog-primary-dark border-orange-200';
      case 'TD':
        return 'bg-green-50 text-green-800 border-green-200';
      case 'Résultats de TD':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'Résultats d\'examen':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'Sujets d\'examen':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      default:
        return 'bg-ujlog-cream text-ujlog-ink-soft border-ujlog-border';
    }
  };

  // Si aucun niveau n'a été sélectionné
  if (!rawNiveau) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-5">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-ujlog-ink-soft hover:text-ujlog-primary-dark transition-colors font-semibold text-xs group"
        >
          <div className="w-6 h-6 rounded-lg bg-white border border-ujlog-border flex items-center justify-center group-hover:bg-orange-50 transition-colors">
            <ArrowLeft className="w-3 h-3" />
          </div>
          <span>Tableau de bord</span>
        </Link>

        {/* Message d'information principal */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-ujlog-border p-5 sm:p-7 shadow-2xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-5 border-b border-ujlog-border">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-ujlog-primary-dark shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ujlog-primary-dark">Bibliothèque UJLOG</p>
                <h2 className="font-display text-base sm:text-lg font-bold text-ujlog-ink tracking-tight mt-1">Choisir un niveau</h2>
                <p className="text-xs text-ujlog-ink-soft leading-relaxed mt-1 max-w-xl">Sélectionnez votre niveau pour afficher uniquement les ressources qui vous concernent.</p>
              </div>
            </div>
            <Link href="/dashboard" className="text-xs font-bold text-ujlog-ink-soft hover:text-ujlog-primary-dark transition-colors">Retour au tableau de bord</Link>
          </div>

          <div className="w-full pt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {availableLevels.map((lvl) => (
              <Link
                key={lvl.id}
                href={lvl.type === 'direct' ? `/dashboard/cours?niveau=${lvl.id}` : `/dashboard/niveau/${lvl.id}`}
                className="group flex items-center justify-between p-3.5 rounded-xl bg-ujlog-cream hover:bg-orange-50/80 border border-ujlog-border hover:border-orange-300 transition-all text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white border border-ujlog-border flex items-center justify-center text-ujlog-primary-dark font-bold text-xs group-hover:bg-orange-700 group-hover:text-white transition-colors">
                    <GraduationCap className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-ujlog-ink group-hover:text-ujlog-primary-dark">
                      {lvl.name}
                    </h4>
                    <span className="text-[10px] text-ujlog-ink-soft font-normal">
                      {lvl.desc}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-ujlog-ink-soft/60 group-hover:text-ujlog-primary-dark transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  const niveauId = rawNiveau.toUpperCase();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-5">
      {/* Header & Back Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-ujlog-ink-soft hover:text-ujlog-primary-dark transition-colors font-semibold text-xs mb-1.5 group"
          >
            <div className="w-6 h-6 rounded-lg bg-white border border-ujlog-border flex items-center justify-center group-hover:bg-orange-50 transition-colors">
              <ArrowLeft className="w-3 h-3" />
            </div>
            <span>Tableau de bord</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-orange-50 text-ujlog-primary-dark text-[10px] font-bold uppercase tracking-wider rounded-md border border-orange-200">
              Niveau {niveauId}
            </span>
            {parcoursId && (
              <span className="px-2 py-0.5 bg-ujlog-cream text-ujlog-ink-soft text-[10px] font-semibold uppercase tracking-wider rounded-md border border-ujlog-border">
                {parcoursId}
              </span>
            )}
          </div>
          <h1 className="font-display text-lg sm:text-xl font-bold text-ujlog-ink tracking-tight mt-1">
            Ressources Académiques
          </h1>
          <p className="text-ujlog-ink-soft font-normal text-xs mt-0.5">
            Consultez et téléchargez vos cours magistraux, fiches de TD, résultats et sujets d&apos;examen.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-ujlog-border bg-white px-3 py-1.5 text-xs font-semibold text-ujlog-ink">
            <Layers className="h-3.5 w-3.5 text-ujlog-primary" aria-hidden="true" />
            <span>{filteredCourses.length} {filteredCourses.length <= 1 ? 'ressource' : 'ressources'}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((value) => !value)}
            aria-expanded={showFilters}
            aria-controls="course-filters"
            className="inline-flex items-center gap-2 rounded-full border border-ujlog-border bg-white px-3 py-1.5 text-xs font-semibold text-ujlog-ink hover:border-orange-300 hover:text-ujlog-primary-dark transition-colors"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            Filtres
          </button>
        </div>
      </div>

      {/* Active Filters Info */}
      <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
        <div className="text-[11px] text-ujlog-ink-soft font-medium">
          Semestre {activeTab} • Niveau {niveauId} {parcoursId ? `(${parcoursId})` : ''}
        </div>
      </div>

      {/* Semester Switcher Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-ujlog-cream/80 rounded-xl w-fit border border-ujlog-border">
        <button
          onClick={() => setActiveTab(1)}
          className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${activeTab === 1
              ? 'bg-white text-ujlog-primary-dark shadow-2xs'
              : 'text-ujlog-ink-soft hover:text-ujlog-ink'
            }`}
        >
          Semestre 1
        </button>
        <button
          onClick={() => setActiveTab(2)}
          className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${activeTab === 2
              ? 'bg-white text-ujlog-primary-dark shadow-2xs'
              : 'text-ujlog-ink-soft hover:text-ujlog-ink'
            }`}
        >
          Semestre 2
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div id="course-filters" className="bg-white rounded-2xl border border-ujlog-border shadow-2xs p-2.5 sm:p-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ujlog-ink-soft/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un cours, un enseignant..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-transparent bg-ujlog-cream text-xs font-medium text-ujlog-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/15 focus:border-orange-200 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            {(subjectFilter !== 'all' || typeFilter !== 'all' || yearFilter !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={() => { setSubjectFilter('all'); setTypeFilter('all'); setYearFilter('all'); setSearchQuery(''); }}
                className="inline-flex items-center gap-1.5 px-2.5 py-2.5 rounded-xl text-xs font-bold text-ujlog-ink-soft hover:text-red-600 transition-colors"
                title="Réinitialiser les filtres"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Réinitialiser</span>
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="mt-2.5 pt-2.5 border-t border-ujlog-border grid grid-cols-1 sm:grid-cols-3 gap-2">
            {isTroncCommun && (
              <label className="block">
                <span className="sr-only">Matière</span>
                <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-ujlog-border bg-white text-xs font-semibold text-ujlog-ink focus:outline-none focus:border-orange-300">
                  <option value="all">Toutes les matières</option><option value="geo">Géographie</option><option value="histoire">Histoire</option>
                </select>
              </label>
            )}
            <label className="block">
              <span className="sr-only">Type</span>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-ujlog-border bg-white text-xs font-semibold text-ujlog-ink focus:outline-none focus:border-orange-300">
                <option value="all">Tous les types</option>{RESOURCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="sr-only">Année universitaire</span>
              <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-ujlog-border bg-white text-xs font-semibold text-ujlog-ink focus:outline-none focus:border-orange-300">
                <option value="all">Toutes les années</option>{academicYears.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
          </div>
        )}
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredCourses.map((course) => {
          const saved = isSaved(course.id);
          const dlState = downloadStates[course.id];
          const isDownloading = dlState?.status === 'downloading';
          const isDownloaded = dlState?.status === 'downloaded';
          const hasDownloadError = dlState?.status === 'error';

          return (
            <motion.div
              layout
              key={course.id}
              className="bg-white rounded-2xl p-4 border border-ujlog-border shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getTypeBadgeStyle(course.type)}`}>
                    {course.type}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-ujlog-ink-soft/60 font-medium">
                    <Calendar className="w-3 h-3" />
                    <span>{course.annee}</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-ujlog-ink group-hover:text-ujlog-primary-dark transition-colors leading-snug line-clamp-2">
                    {course.titre}
                  </h3>
                  <p className="text-[11px] text-ujlog-ink-soft font-medium mt-0.5">
                    {course.enseignant}
                  </p>
                </div>

                <p className="text-ujlog-ink-soft text-xs font-normal leading-relaxed line-clamp-2">
                  {course.description}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-ujlog-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => (isDownloading ? handleCancelDownload(course) : handleDownload(course))}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer min-w-[74px] justify-center ${hasDownloadError
                        ? 'bg-red-50 text-red-600 border border-red-200'
                        : isDownloaded
                          ? 'bg-orange-700 text-white'
                          : isDownloading
                            ? 'bg-ujlog-cream text-ujlog-ink border border-ujlog-border'
                            : 'bg-ujlog-ink text-white hover:bg-ujlog-primary-dark'
                      }`}
                  >
                    {hasDownloadError ? (
                      <>
                        <AlertCircle className="w-3 h-3" />
                        <span>Indisponible</span>
                      </>
                    ) : isDownloading ? (
                      <>
                        <span>{dlState.progress}%</span>
                        <X className="w-3 h-3" />
                      </>
                    ) : isDownloaded ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Téléchargé</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3 h-3" />
                        <span>PDF</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setSelectedCourse(course)}
                    className="p-1.5 rounded-lg border border-ujlog-border text-ujlog-ink-soft hover:bg-ujlog-cream transition-colors cursor-pointer"
                    title="Aperçu rapide"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => toggleSave(course.id)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${saved
                      ? 'bg-orange-50 border-orange-200 text-orange-700'
                      : 'border-ujlog-border text-ujlog-ink-soft/60 hover:text-ujlog-ink-soft hover:bg-ujlog-cream'
                    }`}
                  title={saved ? 'Enregistré dans vos favoris' : 'Enregistrer'}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-orange-600' : ''}`} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredCourses.length === 0 && (
        <div className="text-center py-10 bg-white rounded-2xl border border-ujlog-border p-6 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-ujlog-cream text-ujlog-ink-soft/60 flex items-center justify-center mx-auto mb-2">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-xs sm:text-sm font-bold text-ujlog-ink">
            Aucun document trouvé
          </h3>
          <p className="text-xs text-ujlog-ink-soft font-normal max-w-sm mx-auto mt-0.5">
            Aucune ressource ne correspond aux critères sélectionnés pour le Semestre {activeTab}.
          </p>
        </div>
      )}

      {/* Modal Aperçu du Document */}
      <AnimatePresence>
        {selectedCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ujlog-ink/50 backdrop-blur-2xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-ujlog-border space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getTypeBadgeStyle(selectedCourse.type)}`}>
                  {selectedCourse.type} • Semestre {selectedCourse.semestre}
                </span>
                <button
                  onClick={() => setSelectedCourse(null)}
                  className="w-6 h-6 rounded-full bg-ujlog-cream flex items-center justify-center text-ujlog-ink-soft hover:bg-ujlog-border transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <h3 className="text-sm sm:text-base font-bold text-ujlog-ink leading-snug">
                  {selectedCourse.titre}
                </h3>
                <p className="text-xs text-ujlog-ink-soft font-medium mt-0.5">
                  Enseignant : {selectedCourse.enseignant}
                </p>
              </div>

              <div className="bg-ujlog-cream rounded-xl p-3.5 border border-ujlog-border text-xs text-ujlog-ink-soft font-normal leading-relaxed space-y-2">
                <p>{selectedCourse.description}</p>
                <div className="pt-2 border-t border-ujlog-border/60 flex items-center justify-between text-[10px] text-ujlog-ink-soft/60 font-medium">
                  <span>Année : {selectedCourse.annee}</span>
                  <span>{selectedCourse.telechargements} téléchargements</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setSelectedCourse(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-ujlog-ink-soft hover:bg-ujlog-cream transition-colors cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  onClick={() => {
                    handleDownload(selectedCourse);
                    setSelectedCourse(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-ujlog-primary text-white hover:brightness-110 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Télécharger</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CoursesPage() {
  return (
    <Suspense fallback={
      <div className="p-8 text-center text-ujlog-ink-soft/60 text-xs font-bold">
        Chargement des ressources académiques...
      </div>
    }>
      <CoursesContent />
    </Suspense>
  );
}
