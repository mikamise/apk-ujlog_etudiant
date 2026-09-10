import {
  StudentAccount,
  DelegateManagementRecord,
  AcademicResultItem,
  SystemAuditLog,
  SystemNotification,
  SystemStats,
  CourseItem,
} from './admin-types';

/**
 * ADAPTATEUR — remplace l'ancien AdminStore basé sur localStorage et ses
 * données de démonstration (faux étudiant KOUASSI Jean-Yves, faux Super
 * Admin avec code "SUPER-ADMIN-2026", faux délégué, faux cours archivés,
 * etc. — voir audit). Interface publique conservée pour limiter la
 * réécriture des vues super-admin déjà construites ; l'implémentation ne
 * conserve plus AUCUNE donnée métier côté client. Les méthodes de lecture
 * synchrones renvoient un état vide honnête et servent uniquement de
 * repli lorsque l'appel réseau réel (déjà présent dans les pages
 * consommatrices) échoue — jamais de contenu inventé pour "remplir
 * l'écran".
 */
export class AdminStore {
  // ---------- Session (gérée par les cookies Supabase, plus par localStorage) ----------
  static getSuperAdminSession(): null {
    return null;
  }
  static setSuperAdminSession(_session: unknown) {
    void _session;
  }
  static clearSuperAdminSession() {}

  // ---------- Lecture (repli vide ; la vraie donnée vient du fetch() déjà en place) ----------
  static getSystemStats(): SystemStats {
    return {
      totalStudents: 0,
      totalDelegates: 0,
      totalCourses: 0,
      recentPublicationsCount: 0,
      activeUsersCount: 0,
      studentsByLevel: {},
      studentsBySection: {},
      coursesByLevel: {},
      activityTimeline: [],
    };
  }
  static getStudents(): StudentAccount[] {
    return [];
  }
  static getDelegates(): DelegateManagementRecord[] {
    return [];
  }
  static getAllCourses(): CourseItem[] {
    return [];
  }
  static getAcademicResults(): AcademicResultItem[] {
    return [];
  }
  static getAuditLogs(): SystemAuditLog[] {
    return [];
  }
  static getAdminNotifications(): SystemNotification[] {
    return [];
  }
  static getArchivedSessions(): Array<{ id: string; year: string; archivedAt: string; studentsCount: number; coursesCount: number }> {
    return [];
  }
  static getAcademicYears(): string[] {
    return [];
  }
  static getActiveAcademicYear(): string {
    return '';
  }

  // ---------- Écriture : proxies réels vers les routes API, jamais de persistance locale ----------

  static async revokeDelegate(id: string, ..._rest: unknown[]): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/admin/delegates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'revoked' }),
      });
      const data = await res.json();
      return { success: Boolean(data.success), error: data.error };
    } catch {
      return { success: false, error: 'Erreur réseau.' };
    }
  }

  static async reactivateDelegate(id: string, ..._rest: unknown[]): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/admin/delegates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      const data = await res.json();
      return { success: Boolean(data.success), error: data.error };
    } catch {
      return { success: false, error: 'Erreur réseau.' };
    }
  }

  static async updateCourseStatus(id: string, status: string, ..._rest: unknown[]): Promise<{ success: boolean; error?: string }> {
    // Traduit les libellés français utilisés par l'UI vers les valeurs réelles de l'enum en base.
    const STATUS_MAP: Record<string, string> = {
      'publié': 'published',
      'publie': 'published',
      'brouillon': 'draft',
      'archivé': 'archived',
      'archive': 'archived',
      published: 'published',
      draft: 'draft',
      archived: 'archived',
      deleted: 'deleted',
    };
    const dbStatus = STATUS_MAP[status] || status;
    try {
      const res = await fetch(`/api/admin/courses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: dbStatus }),
      });
      const data = await res.json();
      return { success: Boolean(data.success), error: data.error };
    } catch {
      return { success: false, error: 'Erreur réseau.' };
    }
  }

  static async deleteCoursePermanently(id: string, ..._rest: unknown[]): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/courses/${id}`, { method: 'DELETE' });
      const data = await res.json();
      return { success: Boolean(data.success), error: data.error };
    } catch {
      return { success: false, error: 'Erreur réseau.' };
    }
  }

  static async addAcademicYear(id: string, startYear: number = new Date().getFullYear(), endYear: number = new Date().getFullYear() + 1, ..._rest: unknown[]): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/academic-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, startYear, endYear }),
      });
      const data = await res.json();
      return { success: Boolean(data.success), error: data.error };
    } catch {
      return { success: false, error: 'Erreur réseau.' };
    }
  }

  static async runAnnualArchiving(academicYearId: string, ..._rest: unknown[]): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/admin/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academicYearId }),
      });
      const data = await res.json();
      return { success: Boolean(data.success), error: data.error };
    } catch {
      return { success: false, error: 'Erreur réseau.' };
    }
  }

  static async sendNotification(payload: { title: string; message: string; levelCode?: string; fieldCode?: string }, ..._rest: unknown[]): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return { success: Boolean(data.success), error: data.error };
    } catch {
      return { success: false, error: 'Erreur réseau.' };
    }
  }

  // ---------- Fonctionnalités désormais remplacées par le système d'invitation ----------
  // (création directe de délégué/admin par formulaire = faille de sécurité supprimée à l'audit)

  static createDelegate(..._args: unknown[]): { success: boolean; error: string } {
    return {
      success: false,
      error: 'La création directe est désactivée. Utilisez « Inviter un délégué » (système d’invitation par e-mail).',
    };
  }
  static createDelegateDirect(..._args: unknown[]): { success: boolean; error: string } {
    return AdminStore.createDelegate();
  }
  static regenerateDelegateCode(..._args: unknown[]): { success: boolean; error: string } {
    return {
      success: false,
      error: 'Les codes d’activation ont été supprimés. Renvoyez une nouvelle invitation par e-mail si nécessaire.',
    };
  }
  static async updateDelegate(id: string, updates: { level?: string; section?: string }, ..._rest: unknown[]): Promise<{ success: boolean; error?: string }> {
    const LEVEL_CODE_MAP: Record<string, string> = { 'Licence 1': 'l1', 'Licence 2': 'l2', 'Licence 3': 'l3', 'Master 1': 'm1', 'Master 2': 'm2' };
    const FIELD_CODE_MAP: Record<string, string> = { 'Tronc commun': 'tronc_commun', 'Histoire-Géographie': 'histoire_geographie', 'Histoire': 'histoire', 'Géographie': 'geographie' };
    try {
      const res = await fetch(`/api/admin/delegates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          levelCode: updates.level ? LEVEL_CODE_MAP[updates.level] || updates.level : undefined,
          fieldCode: updates.section ? FIELD_CODE_MAP[updates.section] || updates.section : undefined,
        }),
      });
      const data = await res.json();
      return { success: Boolean(data.success), error: data.error };
    } catch {
      return { success: false, error: 'Erreur réseau.' };
    }
  }
  static async addCourseByAdmin(courseData: {
    title: string;
    description?: string;
    subjectName: string;
    type?: string;
    academicYearId: string;
    semesterId: string;
    levelCode: string;
    fieldCode: string;
    teacherName?: string;
  }, ..._rest: unknown[]): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseData),
      });
      const data = await res.json();
      return { success: Boolean(data.success), error: data.error };
    } catch {
      return { success: false, error: 'Erreur réseau.' };
    }
  }
  static async updateCourseMetadata(id: string, updates: { titre?: string; title?: string; description?: string; matiere?: string; subjectName?: string; enseignant?: string; teacherName?: string }, ..._rest: unknown[]): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/admin/courses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: updates.title ?? updates.titre,
          description: updates.description,
          subjectName: updates.subjectName ?? updates.matiere,
          teacherName: updates.teacherName ?? updates.enseignant,
        }),
      });
      const data = await res.json();
      return { success: Boolean(data.success), error: data.error };
    } catch {
      return { success: false, error: 'Erreur réseau.' };
    }
  }
  static async updateStudentStatus(studentId: string, status: string, ..._rest: unknown[]): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/admin/students/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      return { success: Boolean(data.success), error: data.error };
    } catch {
      return { success: false, error: 'Erreur réseau.' };
    }
  }
  static async updateStudentLevel(
    studentId: string,
    levelCode: string,
    fieldCode: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/admin/students/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levelCode, fieldCode }),
      });
      const data = await res.json();
      return { success: Boolean(data.success), error: data.error };
    } catch {
      return { success: false, error: 'Erreur réseau.' };
    }
  }
  static setActiveAcademicYear(..._args: unknown[]): { success: boolean; error: string } {
    return { success: false, error: 'Non disponible pour le moment.' };
  }

  // ---------- Audit / notifications : écriture serveur uniquement, ces appels client sont neutralisés ----------
  static addAuditLog(..._entry: unknown[]) {
    void _entry;
    // La traçabilité réelle est déjà assurée automatiquement côté serveur (table audit_logs)
    // par chaque route API sensible. Aucune écriture d'audit ne doit venir du navigateur.
  }
  static addNotification(..._notif: unknown[]) {
    void _notif;
  }
  static clearAllNotifications() {}
  static markNotificationAsRead(..._id: unknown[]) {
    void _id;
  }
  static resetAllPlatformData() {
    // Il n'existe plus de données de démonstration à réinitialiser.
  }
}
