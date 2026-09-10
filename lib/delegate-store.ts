import {
  DelegateCourse,
  DelegateScope,
  DelegateNotification,
  DelegateActionLog,
  DelegateStats,
} from './delegate-types';

/**
 * ADAPTATEUR — remplace l'ancien DelegateStore basé sur localStorage.
 *
 * L'interface publique (noms de méthodes) est volontairement conservée
 * pour ne pas avoir à réécrire l'intégralité de l'UI existante
 * (components/delegate/delegate-dashboard-view.tsx notamment). Mais
 * l'implémentation ne stocke plus AUCUNE donnée métier dans le
 * navigateur : tout passe par les routes API réelles (Supabase).
 *
 * - L'authentification réelle passe par /api/auth/login (Supabase Auth).
 * - Le "code d'activation" a été remplacé par le système d'invitation
 *   (/api/admin/invitations/accept) — voir components/delegate/delegate-activation.tsx.
 * - Il n'existe plus de mot de passe universel ni de contournement.
 */
export class DelegateStore {
  /** @deprecated conservé pour compatibilité de type, ne contient plus de données de démonstration. */
  static getActivationCodes(): never[] {
    return [];
  }

  static async getCoursesAsync(): Promise<DelegateCourse[]> {
    try {
      const res = await fetch('/api/delegate/courses');
      const payload = await res.json();
      if (!payload.success || !Array.isArray(payload.data)) return [];
      return payload.data.map(
        (row: Record<string, unknown>): DelegateCourse => {
          const semestersData = row.semesters as { semester_number?: number } | { semester_number?: number }[] | undefined;
          const semesterNumber = Array.isArray(semestersData)
            ? (semestersData[0]?.semester_number ?? 1)
            : (semestersData?.semester_number ?? (row.semestre as number) ?? (row.semester_number as number) ?? 1);

          return {
            id: String(row.id),
            titre: String(row.title ?? ''),
            description: String(row.description ?? ''),
            matiere: String(row.subject_name ?? ''),
            semestre: Number(semesterNumber),
            annee: String(row.academic_year_id ?? ''),
            type: String(row.type ?? 'CM'),
            enseignant: String(row.teacher_name ?? ''),
            niveau: String(row.level_code ?? ''),
            section: String(row.field_code ?? ''),
            niveauCode: String(row.level_code ?? ''),
            status: (row.status as DelegateCourse['status']) ?? 'published',
            authorEmail: '',
            authorName: '',
            createdAt: String(row.created_at ?? ''),
            updatedAt: String(row.created_at ?? ''),
            telechargements: Number(row.download_count ?? 0),
          };
        }
      );
    } catch {
      return [];
    }
  }

  /** @deprecated synchrone, conservé pour compatibilité : renvoie toujours [] désormais.
   *  Utiliser getCoursesAsync() (ou un useEffect + fetch direct) dans tout nouveau code. */
  static getCourses(): DelegateCourse[] {
    return [];
  }

  static async createCourse(payload: {
    title: string;
    description: string;
    subjectName: string;
    type: string;
    academicYearId: string;
    semesterId: string;
    levelCode: string;
    fieldCode: string;
    teacherName?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return data.success ? { success: true } : { success: false, error: data.error };
    } catch {
      return { success: false, error: 'Erreur réseau.' };
    }
  }

  static async deleteCourse(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/delegate/courses/${id}`, { method: 'DELETE' });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  /**
   * SÉCURITÉ : cette authentification 100% côté client a été désactivée
   * (voir historique : mot de passe universel + contournement supprimés).
   * La vraie connexion délégué passe par /api/auth/login.
   */
  static authenticateDelegate(): { success: boolean; session?: { email: string; name: string; scope: DelegateScope }; error?: string } {
    return {
      success: false,
      error: 'Cette méthode est désactivée. Utilisez la connexion officielle (/api/auth/login).',
    };
  }

  /** Session dérivée du profil réel renvoyé par /api/auth/me, jamais de localStorage. */
  static async getSessionAsync(): Promise<{ email: string; name: string; scope: DelegateScope } | null> {
    try {
      const res = await fetch('/api/auth/me');
      const payload = await res.json();
      if (!payload.success || !payload.user || payload.user.role !== 'delegate' || !payload.user.delegateProfile) {
        return null;
      }
      const dp = payload.user.delegateProfile;
      return {
        email: payload.user.email,
        name: `${payload.user.firstName} ${payload.user.lastName}`,
        scope: {
          level: dp.level_code,
          section: dp.field_code,
          academicYear: dp.academic_year_id,
          permissions: ['publish_course', 'edit_own_course', 'delete_own_course'],
          levelCode: dp.level_code,
        },
      };
    } catch {
      return null;
    }
  }

  /** @deprecated synchrone, conservé pour compatibilité : renvoie toujours null. */
  static getSession(): { email: string; name: string; scope: DelegateScope } | null {
    return null;
  }

  static async setSession(session: unknown) {
    // La session est intégralement gérée par les cookies Supabase (httpOnly).
    void session;
  }

  static async logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // best-effort
    }
  }

  /** État honnête : pas encore branché à un flux de notifications personnel délégué. Jamais de contenu inventé. */
  static getNotifications(): DelegateNotification[] {
    return [];
  }

  static addNotification(notif: Omit<DelegateNotification, 'id' | 'date' | 'read'>) {
    void notif;
    // Les notifications réelles sont générées côté serveur (app/api/courses/route.ts) à la publication.
  }

  /** Traçabilité réelle disponible côté admin (/api/admin/activity) ; vide ici tant que l'écran délégué
   *  n'expose pas encore son propre flux d'audit personnel — jamais de logs inventés. */
  static getLogs(): DelegateActionLog[] {
    return [];
  }

  static addLog(log: Omit<DelegateActionLog, 'id' | 'timestamp'>) {
    void log;
    // La traçabilité réelle est assurée côté serveur (table audit_logs) sur chaque route API.
  }

  static async getStatsAsync(): Promise<DelegateStats> {
    try {
      const res = await fetch('/api/delegate/stats');
      const payload = await res.json();
      if (!payload.success) return { publishedCount: 0, draftsCount: 0, recentPublicationsCount: 0, totalDownloads: 0 };
      return {
        publishedCount: payload.stats.coursesPublished ?? 0,
        draftsCount: 0,
        recentPublicationsCount: 0,
        totalDownloads: payload.stats.totalDownloads ?? 0,
      };
    } catch {
      return { publishedCount: 0, draftsCount: 0, recentPublicationsCount: 0, totalDownloads: 0 };
    }
  }

  /** @deprecated synchrone, conservé pour compatibilité : toujours des compteurs à 0. */
  static getStats(): DelegateStats {
    return { publishedCount: 0, draftsCount: 0, recentPublicationsCount: 0, totalDownloads: 0 };
  }
}
