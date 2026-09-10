export type UserRole = 'student' | 'delegate' | 'admin' | 'super_admin';

export type CourseType = 
  | 'CM' 
  | 'TD' 
  | 'TP'
  | 'PV'
  | 'Sujet'
  | 'Résultats de TD' 
  | 'Résultats d\'examen' 
  | 'Sujets d\'examen'
  | string;
export type CourseStatus = 'published' | 'draft' | 'pending' | 'deleted';

export interface DelegateScope {
  level: string;        // e.g. "Licence 2" or "Licence 3"
  section: string;      // e.g. "Tronc commun" or "Géographie"
  academicYear: string; // e.g. "2026-2027"
  permissions: string[];
  levelCode: string;    // e.g. "l2", "l3", "m1", "m2"
}

export interface ActivationCodeRecord {
  code: string;
  assignedEmail?: string;
  assignedName?: string;
  role: 'delegate';
  level: string;
  section: string;
  levelCode: string;
  academicYear: string;
  permissions: string[];
  status: 'active' | 'used' | 'expired';
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
  usedByEmail?: string;
}

export interface DelegateCourse {
  id: string;
  titre: string;
  description: string;
  matiere: string;      // 'Géographie' | 'Histoire' | string
  semestre: number;     // 1 | 2
  annee: string;        // '2026-2027'
  type: CourseType;
  enseignant: string;
  niveau: string;       // 'Licence 2'
  section: string;      // 'Tronc commun'
  niveauCode: string;   // 'l2'
  status: CourseStatus;
  fileName?: string;
  fileSize?: string;
  fileMimeType?: string;
  documentUrl?: string;
  authorEmail: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  telechargements: number;
}

export interface DelegateNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  type: 'publication' | 'deletion' | 'authorization' | 'system';
  read: boolean;
}

export interface DelegateActionLog {
  id: string;
  action: 'activation' | 'login' | 'course_created' | 'course_published' | 'course_updated' | 'course_deleted';
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface DelegateStats {
  publishedCount: number;
  draftsCount: number;
  recentPublicationsCount: number;
  totalDownloads: number;
}
