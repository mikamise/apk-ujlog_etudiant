'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bookmark, Trash2, ArrowLeft, BookOpen, Loader2, Download, Check, AlertCircle } from 'lucide-react';
import { useSavedCourses } from '@/hooks/use-saved-courses';
import Link from 'next/link';

interface SavedCourseItem {
  id: string;
  titre: string;
  type: string;
  semestre: number;
  enseignant: string;
  description: string;
  annee: string;
  levelCode?: string;
}

export default function SauvegardesPage() {
  const { toggleSave, isLoaded } = useSavedCourses();
  const [apiFavorites, setApiFavorites] = useState<SavedCourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadState, setDownloadState] = useState<Record<string, 'success' | 'error' | undefined>>({});

  useEffect(() => {
    let active = true;
    fetch('/api/favorites')
      .then((res) => res.json())
      .then((payload) => {
        if (active) {
          // Adapte la forme { id, courses: {...} } renvoyée par Supabase vers celle attendue par l'UI.
          const list = payload.success && Array.isArray(payload.data)
            ? payload.data
                .map((f: { id: string; courses: Record<string, unknown> | null }) => {
                  if (!f.courses) return null;
                  return {
                    id: String(f.courses.id),
                    titre: String(f.courses.title ?? ''),
                    type: String(f.courses.type ?? ''),
                    semestre: 1,
                    enseignant: String(f.courses.teacher_name ?? 'Non renseigné'),
                    description: String(f.courses.description ?? ''),
                    annee: String(f.courses.academic_year_id ?? ''),
                    levelCode: f.courses.level_code ? String(f.courses.level_code) : undefined,
                  } as SavedCourseItem;
                })
                .filter((c: SavedCourseItem | null): c is SavedCourseItem => c !== null)
            : [];
          setApiFavorites(list);
          setLoading(false);
        }
      })
      .catch(() => {
        // Aucune donnée fictive en cas d'échec réseau : liste vide, état "empty" affiché.
        if (active) {
          setApiFavorites([]);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleRemove = async (courseId: string) => {
    // Retrait optimiste de l'affichage local...
    setApiFavorites((prev) => prev.filter((c) => c.id !== courseId));
    // ...et suppression réelle côté Supabase (le hook connaît le vrai id de ligne `saved_courses`).
    await toggleSave(courseId);
  };

  const handleDownload = async (courseId: string) => {
    try {
      const res = await fetch(`/api/courses/${courseId}/download`, { method: 'POST' });
      const payload = await res.json().catch(() => null);
      const files: { name: string; url: string | null }[] = payload?.data?.files ?? [];
      const downloadableFiles = files.filter((f) => f.url);

      if (downloadableFiles.length === 0) {
        setDownloadState((prev) => ({ ...prev, [courseId]: 'error' }));
        setTimeout(() => setDownloadState((prev) => ({ ...prev, [courseId]: undefined })), 3000);
        return;
      }

      downloadableFiles.forEach((file) => {
        const link = document.createElement('a');
        link.href = file.url as string;
        link.download = file.name || '';
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });

      setDownloadState((prev) => ({ ...prev, [courseId]: 'success' }));
      setTimeout(() => setDownloadState((prev) => ({ ...prev, [courseId]: undefined })), 2500);
    } catch {
      setDownloadState((prev) => ({ ...prev, [courseId]: 'error' }));
      setTimeout(() => setDownloadState((prev) => ({ ...prev, [courseId]: undefined })), 3000);
    }
  };

  if (loading && !isLoaded) {
    return (
      <div className="p-8 text-center text-ujlog-ink-soft/60 font-semibold text-xs flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-ujlog-primary-dark" />
        <span>Chargement de vos sauvegardes...</span>
      </div>
    );
  }

  const savedList = apiFavorites;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-5">
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
          <h1 className="text-base sm:text-lg font-bold text-ujlog-ink tracking-tight">
            Mes documents sauvegardés
          </h1>
          <p className="text-ujlog-ink-soft font-normal text-xs mt-0.5">
            Retrouvez et téléchargez rapidement vos cours, fiches de TD et sujets d&apos;examen mis de côté.
          </p>
        </div>

        <div className="bg-white px-3 py-1.5 rounded-xl border border-ujlog-border shadow-soft-warm self-start sm:self-auto text-xs font-semibold text-ujlog-ink-soft flex items-center gap-3">
          <span><span className="text-ujlog-primary-dark font-bold">{savedList.length}</span> document(s) sauvegardé(s)</span>
          <Link href="/dashboard/telechargements" className="text-ujlog-secondary-dark font-bold hover:underline">
            Mes téléchargements →
          </Link>
        </div>
      </div>

      {savedList.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center max-w-md mx-auto text-center py-10 bg-white rounded-2xl border border-ujlog-border p-6 shadow-soft-warm space-y-3"
        >
          <div className="w-10 h-10 bg-orange-50 border border-orange-200/80 rounded-xl flex items-center justify-center text-ujlog-primary-dark shadow-2xs">
            <Bookmark className="w-5 h-5" />
          </div>
          <h2 className="text-xs sm:text-sm font-bold text-ujlog-ink tracking-tight">
            Aucun document sauvegardé
          </h2>
          <p className="text-ujlog-ink-soft font-normal text-xs leading-relaxed max-w-xs">
            Parcourez vos ressources académiques et cliquez sur l&apos;icône de signet pour enregistrer un cours ici et le télécharger plus tard.
          </p>
          <div className="pt-1">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-terracotta-gradient text-white font-bold text-xs rounded-xl hover:brightness-105 transition-all shadow-glow-orange"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Choisir un niveau</span>
            </Link>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {savedList.map((course) => {
            const state = downloadState[course.id];
            return (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              key={course.id}
              className="bg-white rounded-2xl p-4 border border-ujlog-border shadow-soft-warm flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-orange-50 text-ujlog-primary-dark text-[10px] font-bold uppercase rounded-md border border-orange-200">
                    {course.type} · Semestre {course.semestre}
                  </span>
                  <button
                    onClick={() => handleRemove(course.id)}
                    className="p-1 rounded-lg text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Retirer de mes sauvegardes"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-ujlog-ink leading-snug">
                  {course.titre}
                </h3>
                <p className="text-[11px] text-ujlog-ink-soft/60 font-medium">
                  {course.enseignant}
                </p>
                <p className="text-xs text-ujlog-ink-soft font-normal line-clamp-2">
                  {course.description}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-ujlog-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-ujlog-ink-soft/60 font-medium">Année {course.annee}</span>
                  <Link
                    href={`/dashboard/cours?niveau=${('levelCode' in course && course.levelCode) ? course.levelCode : 'l2'}`}
                    className="text-xs font-bold text-ujlog-primary-dark hover:text-ujlog-primary-dark"
                  >
                    Ouvrir →
                  </Link>
                </div>
                <button
                  onClick={() => handleDownload(course.id)}
                  className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    state === 'error'
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : state === 'success'
                      ? 'bg-ujlog-secondary text-white'
                      : 'bg-ujlog-ink text-white hover:bg-ujlog-primary-dark'
                  }`}
                >
                  {state === 'error' ? (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Fichier indisponible</span>
                    </>
                  ) : state === 'success' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Téléchargé</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Télécharger</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
