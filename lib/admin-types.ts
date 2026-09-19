import { UserRole, DelegateCourse } from './delegate-types';

export type CourseItem = DelegateCourse;

export type StudentAccountStatus = 'actif' | 'suspendu' | 'en_attente';
export type DelegateAccountStatus = 'active' | 'pending' | 'revoked';

export interface StudentHistoryItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
}

export interface StudentAccount {
  id: string;
  studentId: string;
  lastName: string;
  firstName: string;
  email: string;
  level: string; // 'Licence 1', 'Licence 2', 'Licence 3', 'Master 1', 'Master 2'
  field: string; // 'Tronc commun', 'Histoire', 'Géographie', etc.
  academicYear: string;
  registrationDate: string;
  status: StudentAccountStatus;
  role: UserRole;
  avatarUrl?: string;
  history: StudentHistoryItem[];
}

export interface DelegateManagementRecord {
  id: string;
  studentId: string;
  email: string;
  name: string;
  level: string;
  section: string;
  levelCode: string;
  academicYear: string;
  status: DelegateAccountStatus;
  activationCode: string;
  permissions: string[];
  createdAt: string;
  activatedAt?: string;
  revokedAt?: string;
  history: Array<{
    id: string;
    action: string;
    description: string;
    timestamp: string;
  }>;
}

export interface AcademicResultItem {
  id: string;
  niveau: string;
  section: string;
  niveauCode: string;
  semestre: number;
  matiere: string;
  titre: string;
  type: string;
  datePublication: string;
  effectifTotal: number;
  tauxReussite: number;
  authorName: string;
  documentUrl?: string;
}

export interface SystemAuditLog {
  id: string;
  userEmail: string;
  userName: string;
  role: UserRole;
  action: string;
  target: string;
  result: 'Succès' | 'Échec' | 'Information';
  timestamp: string;
  ipAddress?: string;
  details?: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  type: 'account' | 'delegate' | 'course_published' | 'course_deleted' | 'publication_error' | 'delegate_revoked' | 'system';
  read: boolean;
}

export interface SystemStats {
  totalStudents: number;
  totalDelegates: number;
  totalCourses: number;
  recentPublicationsCount: number;
  activeUsersCount: number;
  studentsByLevel: Record<string, number>;
  studentsBySection: Record<string, number>;
  coursesByLevel: Record<string, number>;
  activityTimeline: Array<{
    date: string;
    inscriptions: number;
    publications: number;
  }>;
}
