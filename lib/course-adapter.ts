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

const DB_TYPE_TO_UI_TYPE: Record<string, CourseResourceItemType> = {
  cm: 'CM',
  td: 'TD',
  tp: 'TP',
  td_resultat: 'Résultats de TD',
  examen_resultat: 'Résultats d\'examen',
  sujet: 'Sujets d\'examen',
  pv: 'Résultats d\'examen',
};

/** Convertit une ligne "courses" issue de Supabase vers le format attendu par l'UI existante. */
export function mapCourseRowToItem(row: Record<string, unknown>): CourseItem {
  const semesterNumber = (row.semesters as { semester_number?: number } | undefined)?.semester_number ?? 1;
  return {
    id: String(row.id),
    titre: String(row.title ?? ''),
    matiere: String(row.subject_name ?? ''),
    semestre: semesterNumber,
    annee: String(row.academic_year_id ?? ''),
    type: DB_TYPE_TO_UI_TYPE[String(row.type)] ?? 'CM',
    enseignant: String(row.teacher_name ?? 'Non renseigné'),
    description: String(row.description ?? ''),
    telechargements: Number(row.download_count ?? 0),
    dateAjout: String(row.created_at ?? ''),
    niveauCode: row.level_code ? String(row.level_code) : undefined,
  };
}
