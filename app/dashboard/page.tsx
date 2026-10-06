'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  GraduationCap,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';

import { useUser } from '@/hooks/use-user';
import { CourseCard } from '@/components/dashboard/course-card';
import {
  mapCourseRowToItem,
  type CourseItem,
} from '@/lib/course-adapter';
import {
  LEVEL_CODE_TO_LABEL,
  FIELD_CODE_TO_LABEL,
} from '@/lib/academic-reference';
import { CURRENT_ACADEMIC_YEAR_ID } from '@/lib/academic-year';

const levels = [
  {
    id: 'l1',
    code: 'L1',
    name: 'Licence 1',
    desc: 'Tronc commun',
  },
  {
    id: 'l2',
    code: 'L2',
    name: 'Licence 2',
    desc: 'Tronc commun',
  },
  {
    id: 'l3',
    code: 'L3',
    name: 'Licence 3',
    desc: 'Spécialisations',
  },
  {
    id: 'm1',
    code: 'M1',
    name: 'Master 1',
    desc: 'Cycle de recherche',
  },
  {
    id: 'm2',
    code: 'M2',
    name: 'Master 2',
    desc: 'Cycle terminal',
  },
];

export default function DashboardHome() {
  const { user } = useUser();

  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');

  const [levelFilter, setLevelFilter] = useState(
    user.level?.toLowerCase() || 'all'
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';

    return 'Bonsoir';
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);

      try {
        const res = await fetch('/api/courses?limit=100', {
          cache: 'no-store',
        });

        const payload = await res.json();

        if (!res.ok || !payload.success) {
          throw new Error('courses');
        }

        if (active) {
          setCourses(
            (payload.data || []).map(
              (row: Record<string, unknown>) =>
                mapCourseRowToItem(row)
            )
          );
        }
      } catch {
        if (active) {
          setError(true);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    load();

    const refresh = () => load();

    window.addEventListener(
      'ujlog_courses_updated',
      refresh
    );

    return () => {
      active = false;

      window.removeEventListener(
        'ujlog_courses_updated',
        refresh
      );
    };
  }, []);

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase();

    return courses
      .filter((course) => {
        const matchesLevel =
          levelFilter === 'all' ||
          course.niveauCode?.toLowerCase() === levelFilter;

        if (!matchesLevel) {
          return false;
        }

        if (!q) {
          return true;
        }

        return [
          course.titre,
          course.matiere,
          course.enseignant,
          course.description,
        ].some((value) =>
          value.toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [courses, levelFilter, query]);

  const currentLevel = user.level?.toLowerCase();

  const currentLevelLabel =
    (user.level && LEVEL_CODE_TO_LABEL[user.level]) ||
    'Votre cursus';

  const currentFieldLabel =
    (user.field && FIELD_CODE_TO_LABEL[user.field]) ||
    'Tronc commun';

  return (
    <div className="min-h-full bg-[#fafafa]">
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[28px] border border-orange-200/80 bg-white px-5 py-6 shadow-[0_12px_40px_-24px_rgba(20,20,20,0.28)] sm:px-7 sm:py-8"
        >
          <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-orange-50/70 sm:block" />

          <div className="relative z-10 max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-2xl border border-orange-100 bg-white p-1.5">
                <Image
                  src="/logo-geographie.jpg"
                  alt="UJLOG"
                  fill
                  className="object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange-700">
                  Portail académique
                </p>

                <p className="text-xs font-medium text-stone-500">
                  Année{' '}
                  {user.academicYear ||
                    CURRENT_ACADEMIC_YEAR_ID}
                </p>
              </div>
            </div>

            <h1 className="mt-6 text-2xl font-bold tracking-[-0.035em] text-stone-950 sm:text-3xl">
              {greeting}
              {user.firstName ? `, ${user.firstName}` : ''}.
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 sm:text-[15px]">
              Retrouvez vos cours et ressources directement
              depuis votre espace général. Les espaces délégué
              et administration restent accessibles depuis le
              menu selon vos autorisations.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700">
                {currentLevelLabel}
              </span>

              <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700">
                {currentFieldLabel}
              </span>

              <Link
                href="/dashboard/cours"
                className="inline-flex items-center gap-1.5 rounded-full bg-stone-950 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-stone-800"
              >
                Voir tous les cours
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </motion.section>

        <section className="mt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange-700">
                Ressources
              </p>

              <h2 className="mt-1 text-xl font-bold tracking-[-0.025em] text-stone-950">
                Cours disponibles
              </h2>

              <p className="mt-1 text-sm text-stone-500">
                Le dashboard est votre point d&apos;entrée vers
                l&apos;ensemble du catalogue.
              </p>
            </div>

            <Link
              href="/dashboard/cours"
              className="inline-flex items-center gap-1 text-sm font-bold text-orange-700 hover:text-orange-800"
            >
              Explorer le catalogue
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
            <label className="relative block">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />

              <input
                value={query}
                onChange={(event) =>
                  setQuery(event.target.value)
                }
                placeholder="Rechercher un cours, une matière ou un enseignant"
                className="h-12 w-full rounded-2xl border border-stone-200 bg-white pl-11 pr-4 text-sm font-medium text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </label>

            <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-stone-200 bg-white p-1.5">
              <SlidersHorizontal className="ml-2 h-4 w-4 shrink-0 text-stone-400" />

              <button
                type="button"
                onClick={() => setLevelFilter('all')}
                className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${
                  levelFilter === 'all'
                    ? 'bg-stone-950 text-white'
                    : 'text-stone-500 hover:bg-stone-50'
                }`}
              >
                Tous
              </button>

              {levels.map((level) => (
                <button
                  type="button"
                  key={level.id}
                  onClick={() =>
                    setLevelFilter(level.id)
                  }
                  className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${
                    levelFilter === level.id
                      ? 'bg-orange-600 text-white'
                      : 'text-stone-500 hover:bg-stone-50'
                  }`}
                >
                  {level.code}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="h-52 animate-pulse rounded-2xl border border-stone-200 bg-white"
                  />
                )
              )}
            </div>
          ) : error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
              Impossible de charger les cours pour le
              moment. Vous pouvez ouvrir le catalogue complet
              et réessayer.
            </div>
          ) : filteredCourses.length > 0 ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {filteredCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={{
                    id: course.id,
                    title: course.titre,
                    description: course.description,
                    type: course.type,
                    subjectId: course.matiere,
                    level: course.niveauCode || '—',
                    field: course.enseignant,
                    enseignant: course.enseignant,
                    semestre: course.semestre,
                  }}
                  subjectName={course.matiere}
                />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-700">
                <BookOpen className="h-5 w-5" />
              </div>

              <h3 className="mt-4 text-sm font-bold text-stone-950">
                Aucun cours à afficher
              </h3>

              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-stone-500">
                Essayez une autre recherche ou consultez le
                catalogue complet.
              </p>

              <Link
                href="/dashboard/cours"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-stone-950 px-4 py-2.5 text-xs font-bold text-white"
              >
                Ouvrir le catalogue
              </Link>
            </div>
          )}
        </section>

        <section className="mt-9">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange-700">
                Accès rapide
              </p>

              <h2 className="mt-1 text-lg font-bold tracking-[-0.02em] text-stone-950">
                Votre parcours
              </h2>
            </div>

            <GraduationCap className="h-5 w-5 text-stone-300" />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {levels.map((level) => {
              const selected = currentLevel === level.id;

              return (
                <Link
                  key={level.id}
                  href={`/dashboard/cours?niveau=${level.id}`}
                  className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${
                    selected
                      ? 'border-orange-300 bg-orange-50/60'
                      : 'border-stone-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-orange-700">
                      {level.code}
                    </span>

                    <ChevronRight className="h-4 w-4 text-stone-300" />
                  </div>

                  <p className="mt-4 text-sm font-bold text-stone-950">
                    {level.name}
                  </p>

                  <p className="mt-1 text-xs text-stone-500">
                    {level.desc}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        <div className="mt-8 flex items-center gap-2 border-t border-stone-200 pt-5 text-xs text-stone-400">
          <Sparkles className="h-3.5 w-3.5" />

          <span>
            UJLOG Étudiant · espace général
          </span>
        </div>
      </div>
    </div>
  );
}
