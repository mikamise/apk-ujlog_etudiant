'use client';

import Link from 'next/link';
import { Bookmark, ChevronRight } from 'lucide-react';
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
  };
  subjectName?: string;
}

export function CourseCard({ course, subjectName }: CourseCardProps) {
  const { isSaved, toggleSave, isLoaded } = useSavedCourses();
  const saved = isLoaded ? isSaved(course.id) : false;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Cours': return 'bg-orange-100 text-ujlog-primary-dark border-orange-200';
      case 'TD': return 'bg-green-100 text-green-900 border-green-200';
      case 'TP': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Document': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-ujlog-cream text-ujlog-ink-soft border-ujlog-border';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-ujlog-border p-4 sm:p-5 flex flex-col h-full hover:border-orange-300 hover:shadow-xs transition-all group">
      <div className="flex justify-between items-start mb-3 gap-2">
        <div className="flex flex-wrap gap-1.5">
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getTypeColor(course.type)}`}>
            {course.type}
          </span>
          {subjectName && (
            <span className="px-2 py-0.5 rounded-md bg-ujlog-cream text-ujlog-ink-soft text-[10px] font-semibold border border-ujlog-border">
              {subjectName}
            </span>
          )}
        </div>
        <button 
          onClick={(e) => { e.preventDefault(); toggleSave(course.id); }}
          className={`p-1.5 rounded-lg transition-colors shrink-0 ${
            saved 
              ? 'bg-green-50 text-green-600 border border-green-200' 
              : 'bg-ujlog-cream text-ujlog-ink-soft/60 hover:bg-ujlog-cream hover:text-ujlog-ink-soft'
          }`}
          aria-label={saved ? "Retirer des sauvegardes" : "Sauvegarder ce cours"}
        >
          <Bookmark className="w-3.5 h-3.5" fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      
      <div className="mb-2">
        <div className="text-[10px] font-bold text-ujlog-ink-soft/60 uppercase tracking-wider mb-0.5">
          {course.level} • {course.field}
        </div>
        <h3 className="text-xs sm:text-sm font-bold text-ujlog-ink leading-snug group-hover:text-ujlog-primary-dark transition-colors line-clamp-2">
          {course.title}
        </h3>
      </div>
      
      <p className="text-xs text-ujlog-ink-soft font-normal leading-relaxed mb-4 flex-1 line-clamp-2">
        {course.description}
      </p>

      <Link 
        href={`/dashboard/cours/${course.id}`}
        className="w-full flex items-center justify-between px-3.5 py-2 bg-ujlog-cream hover:bg-orange-50 text-ujlog-ink-soft hover:text-ujlog-primary-dark rounded-xl font-bold text-xs transition-colors mt-auto border border-ujlog-border"
      >
        <span>Consulter</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
