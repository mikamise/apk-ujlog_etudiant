/**
 * Remplace l'ancien lib/mock-data.ts. Ce fichier ne contient AUCUNE donnée
 * fictive : uniquement des types partagés et une fonction d'adaptation
 * du format renvoyé par l'API Supabase vers celui attendu par l'UI.
 */

export type CourseResourceItemType =
  | 'CM'
  | 'TD'
  | 'TP'
  | 'Résultats de TD'
  | 'Résultats d\'examen'
  | 'Sujets d\'examen';

export interface CourseItem {
  id: string;
  titre: string;
  matiere: string;
  semestre: number;
  annee: string;
  type: CourseResourceItemType;
  enseignant: string;
  description: string;
  telechargements: number;
  dateAjout: string;
  documentUrl?: string;
  niveauCode?: string;
}

export const DB_TYPE_TO_UI_TYPE: Record<string, CourseResourceItemType> = {
  cm: 'CM',
  td: 'TD',
  tp: 'TP',
  td_resultat: 'Résultats de TD',
  examen_resultat: 'Résultats d\'examen',
  sujet: 'Sujets d\'examen',
  pv: 'Résultats d\'examen',
};

export const DB_COURSE_TYPES = ['cm', 'td', 'tp', 'pv', 'sujet', 'examen_resultat', 'td_resultat'] as const;
export type DbCourseType = (typeof DB_COURSE_TYPES)[number];

const UI_TYPE_TO_DB_TYPE: Record<string, DbCourseType> = {
  cm: 'cm',
  td: 'td',
  tp: 'tp',
  pv: 'pv',
  sujet: 'sujet',
  'sujets d\'examen': 'sujet',
  'résultats de td': 'td_resultat',
  'résultats d\'examen': 'examen_resultat',
  examen_resultat: 'examen_resultat',
  td_resultat: 'td_resultat',
};

/** "CM" | "Résultats de TD" | "td_resultat"... -> valeur de l'enum PostgreSQL course_type, ou null si inconnue. */
export function toDbCourseType(input: unknown): DbCourseType | null {
  return UI_TYPE_TO_DB_TYPE[String(input ?? '').trim().toLowerCase()] ?? null;
}

/** Convertit une ligne "courses" issue de Supabase vers le format attendu par l'UI existante. */
export function mapCourseRowToItem(row: Record<string, unknown>): CourseItem {
  const semestersData = row.semesters as { semester_number?: number } | { semester_number?: number }[] | undefined;
  const semesterNumber = Array.isArray(semestersData)
    ? (semestersData[0]?.semester_number ?? 1)
    : (semestersData?.semester_number ?? (row.semestre as number) ?? (row.semester_number as number) ?? 1);

  return {
    id: String(row.id),
    titre: String(row.title ?? row.titre ?? ''),
    matiere: String(row.subject_name ?? row.matiere ?? ''),
    semestre: Number(semesterNumber),
    annee: String(row.academic_year_id ?? row.annee ?? ''),
    type: DB_TYPE_TO_UI_TYPE[String(row.type).toLowerCase()] ?? (row.type as CourseResourceItemType) ?? 'CM',
    enseignant: String(row.teacher_name ?? row.enseignant ?? 'Non renseigné'),
    description: String(row.description ?? ''),
    telechargements: Number(row.download_count ?? row.telechargements ?? 0),
    dateAjout: String(row.created_at ?? row.dateAjout ?? ''),
    niveauCode: row.level_code ? String(row.level_code) : (row.niveauCode as string | undefined),
  };
}
