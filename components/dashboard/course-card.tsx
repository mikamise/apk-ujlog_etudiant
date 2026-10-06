'use client';

import Link from 'next/link';

import {
  Bookmark,
  ChevronRight,
  UserRound,
  CalendarDays,
  FileText,
  ClipboardList,
  FlaskConical,
  BarChart3,
  FileQuestion,
} from 'lucide-react';

import { useSavedCourses } from '@/hooks/use-saved-courses';

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    description: string;
    type: string;
    subjectId: string;
    level: string;
    field: string;
    enseignant?: string;
    semestre?: number;
  };

  subjectName?: string;
}

function TypeIcon({
  type,
}: {
  type: string;
}) {
  switch (type) {
    case 'TD':
      return (
        <ClipboardList
          className="h-3 w-3"
          strokeWidth={1.8}
          aria-hidden="true"
        />
      );

    case 'TP':
      return (
        <FlaskConical
          className="h-3 w-3"
          strokeWidth={1.8}
          aria-hidden="true"
        />
      );

    case 'Résultats de TD':
    case "Résultats d'examen":
      return (
        <BarChart3
          className="h-3 w-3"
          strokeWidth={1.8}
          aria-hidden="true"
        />
      );

    case 'Sujets d’examen':
    case "Sujets d'examen":
      return (
        <FileQuestion
          className="h-3 w-3"
          strokeWidth={1.8}
          aria-hidden="true"
        />
      );

    case 'CM':
    default:
      return (
        <FileText
          className="h-3 w-3"
          strokeWidth={1.8}
          aria-hidden="true"
        />
      );
  }
}

function getTypeColor(type: string) {
  switch (type) {
    case 'CM':
      return 'bg-orange-50 text-orange-800 border-orange-200';

    case 'TD':
      return 'bg-sky-50 text-sky-800 border-sky-200';

    case 'TP':
      return 'bg-violet-50 text-violet-800 border-violet-200';

    case 'Résultats de TD':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';

    case "Résultats d'examen":
      return 'bg-amber-50 text-amber-800 border-amber-200';

    case 'Sujets d’examen':
    case "Sujets d'examen":
      return 'bg-rose-50 text-rose-800 border-rose-200';

    default:
      return 'bg-stone-50 text-stone-700 border-stone-200';
  }
}

export function CourseCard({
  course,
  subjectName,
}: CourseCardProps) {
  const {
    isSaved,
    toggleSave,
    isLoaded,
  } = useSavedCourses();

  const saved = isLoaded
    ? isSaved(course.id)
    : false;

  return (
    <div className="group flex h-full flex-col rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_8px_24px_-22px_rgba(20,20,20,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-[0_16px_36px_-24px_rgba(20,20,20,0.4)] sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getTypeColor(
              course.type
            )}`}
          >
            <TypeIcon type={course.type} />

            {course.type}
          </span>

          {subjectName && (
            <span className="rounded-md border border-ujlog-border bg-ujlog-cream px-2 py-0.5 text-[10px] font-semibold text-ujlog-ink-soft">
              {subjectName}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            toggleSave(course.id);
          }}
          className={`shrink-0 rounded-lg p-1.5 transition-colors ${
            saved
              ? 'border border-green-200 bg-green-50 text-green-600'
              : 'bg-ujlog-cream text-ujlog-ink-soft/60 hover:text-ujlog-ink-soft'
          }`}
          aria-label={
            saved
              ? 'Retirer des sauvegardes'
              : 'Sauvegarder ce cours'
          }
        >
          <Bookmark
            className="h-3.5 w-3.5"
            strokeWidth={1.8}
            fill={
              saved
                ? 'currentColor'
                : 'none'
            }
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="mb-3">
        <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-ujlog-ink-soft/60">
          {course.level} • {course.field}
        </div>

        <h3 className="line-clamp-2 text-xs font-bold leading-snug text-ujlog-ink transition-colors group-hover:text-ujlog-primary-dark sm:text-sm">
          {course.title}
        </h3>
      </div>

      <p className="mb-3 line-clamp-2 flex-1 text-xs leading-relaxed text-stone-500">
        {course.description ||
          'Ressource pédagogique UJLOG.'}
      </p>

      <div className="mb-3 grid grid-cols-2 gap-2 border-y border-stone-100 py-2.5">
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-stone-400">
            <UserRound
              className="h-3 w-3"
              strokeWidth={1.8}
              aria-hidden="true"
            />
            Enseignant
          </p>

          <p className="mt-1 truncate text-[11px] font-semibold text-stone-700">
            {course.enseignant ||
              'Non renseigné'}
          </p>
        </div>

        <div>
          <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-stone-400">
            <CalendarDays
              className="h-3 w-3"
              strokeWidth={1.8}
              aria-hidden="true"
            />
            Semestre
          </p>

          <p className="mt-1 text-[11px] font-semibold text-stone-700">
            S{course.semestre || '—'}
          </p>
        </div>
      </div>

      <Link
        href={`/dashboard/cours/${course.id}`}
        className="mt-auto flex w-full items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-bold text-stone-700 transition-colors hover:border-stone-950 hover:bg-stone-950 hover:text-white"
      >
        <span>Consulter</span>

        <ChevronRight
          className="h-3.5 w-3.5"
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </Link>
    </div>
  );
}
