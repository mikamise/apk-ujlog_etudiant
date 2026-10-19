'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Download,
  FileText,
  LoaderCircle,
} from 'lucide-react';
import { useSavedCourses } from '@/hooks/use-saved-courses';
import {
  mapCourseRowToItem,
  type CourseItem,
} from '@/lib/course-adapter';

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const { isSaved, toggleSave } = useSavedCourses();

  const [course, setCourse] = useState<CourseItem | null>(null);

  const [files, setFiles] = useState<
    Array<{
      id: string;
      original_file_name: string;
      mime_type: string;
      file_size_bytes: number | null;
    }>
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetch(`/api/courses/${encodeURIComponent(params.id)}`, {
      cache: 'no-store',
    })
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}));

        if (!res.ok || !payload.success) {
          throw new Error(
            payload.error || 'Cours introuvable.'
          );
        }

        if (!active) return;

        setCourse(mapCourseRowToItem(payload.data));

        setFiles(
          Array.isArray(payload.data?.course_files)
            ? payload.data.course_files
            : []
        );
      })
      .catch((err) => {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : 'Impossible de charger ce cours.'
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <LoaderCircle className="h-6 w-6 animate-spin text-orange-600" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-bold text-orange-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au dashboard
        </Link>

        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          {error || 'Cours introuvable.'}
        </div>
      </div>
    );
  }

  const saved = isSaved(course.id);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm font-bold text-stone-500 hover:text-stone-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </button>

      <article className="mt-5 rounded-[28px] border border-stone-200 bg-white p-5 shadow-[0_12px_40px_-24px_rgba(20,20,20,0.3)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-700">
              {course.type}
            </span>

            <h1 className="mt-4 text-2xl font-bold tracking-[-0.03em] text-stone-950 sm:text-3xl">
              {course.titre}
            </h1>

            <p className="mt-2 text-sm font-semibold text-stone-500">
              {course.matiere} · {course.enseignant}
            </p>
          </div>

          <button
            type="button"
            onClick={() => toggleSave(course.id)}
            className={`rounded-xl border px-4 py-2.5 text-xs font-bold ${
              saved
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-stone-200 bg-white text-stone-600'
            }`}
          >
            {saved ? 'Sauvegardé' : 'Sauvegarder'}
          </button>
        </div>

        {course.description && (
          <p className="mt-7 max-w-3xl text-sm leading-6 text-stone-600">
            {course.description}
          </p>
        )}

        <div className="mt-8 border-t border-stone-200 pt-6">
          <h2 className="text-sm font-bold text-stone-950">
            Ressources disponibles
          </h2>

          {files.length ? (
            <div className="mt-3 space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-700">
                      <FileText className="h-4 w-4" />
                    </div>

                    <span className="truncate text-xs font-semibold text-stone-700">
                      {file.original_file_name}
                    </span>
                  </div>

                  <a
                    href={`/api/courses/${course.id}/download`}
                    className="shrink-0 rounded-lg bg-stone-950 p-2 text-white"
                    aria-label={`Télécharger ${file.original_file_name}`}
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-stone-300 p-5 text-center text-xs text-stone-500">
              <BookOpen className="mx-auto h-5 w-5 text-stone-300" />

              <p className="mt-2">
                Aucun fichier n&apos;est actuellement attaché à ce cours.
              </p>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
