'use client';

/**
 * ClientAuthService - UJLOG Étudiants
 * Multi-platform Authentication & Session Manager
 * 
 * Works across:
 * - Web Browsers (HttpOnly SameSite cookies)
 * - PWA (Persistent secure cookie + offline profile cache)
 * - Future Capacitor Mobile (Android / iOS native wrappers)
 * - Desktop & Tablets
 * 
 * Core Rules:
 * - NEVER store plaintext passwords, password hashes, or sensitive tokens in localStorage.
 * - Server is the single source of truth for authentication.
 * - Temporary offline / network drops DO NOT arbitrarily log out the user.
 * - Explicit logout revokes session on server and cleans local state.
 */

export interface ClientUserProfile {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  civility?: string;
  level?: string;
  field?: string;
  studentId?: string;
  avatarUrl?: string;
  academicYear?: string;
  role?: 'student' | 'delegate' | 'admin' | 'super_admin';
  isDelegate?: boolean;
  delegateScope?: {
    levelCode?: string;
    fieldCode?: string;
    academicYearId?: string;
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isOffline: boolean;
  user: ClientUserProfile | null;
  error: string | null;
}

export const PROFILE_STORAGE_KEY = 'ujlog_user_profile';

/**
 * Sanitize profile before local caching: strictly strip any password, hash or sensitive token
 */
export function sanitizeProfileForCache(raw: any): ClientUserProfile | null {
  if (!raw || typeof raw !== 'object' || !raw.email) return null;

  return {
    id: raw.id || undefined,
    email: String(raw.email).trim().toLowerCase(),
    firstName: String(raw.firstName || raw.prenom || '').trim(),
    lastName: String(raw.lastName || raw.nom || '').trim(),
    civility: raw.civility || undefined,
    level: raw.level || raw.studentProfile?.levelCode || raw.delegateProfile?.levelCode || undefined,
    field: raw.field || raw.studentProfile?.fieldCode || raw.delegateProfile?.fieldCode || undefined,
    studentId: raw.studentId || raw.studentProfile?.studentId || undefined,
    avatarUrl: raw.avatarUrl || undefined,
    academicYear: raw.academicYear || raw.studentProfile?.academicYearId || '2026-2027',
    role: (raw.role?.toLowerCase() as any) || (raw.isDelegate ? 'delegate' : 'student'),
    isDelegate: Boolean(raw.isDelegate || raw.role === 'DELEGATE' || raw.role === 'delegate' || raw.delegateProfile),
    delegateScope: raw.delegateScope || raw.delegateProfile || undefined,
  };
}

export class ClientAuthService {
  /**
   * Get cached non-sensitive user profile from localStorage.
   */
  static getCachedProfile(): ClientUserProfile | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!raw) return null;
      return sanitizeProfileForCache(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  /**
   * Set cached non-sensitive user profile in localStorage.
   */
  static setCachedProfile(profile: ClientUserProfile): void {
    if (typeof window === 'undefined') return;
    try {
      const clean = sanitizeProfileForCache(profile);
      if (clean) {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(clean));
        window.dispatchEvent(new Event('ujlog_user_updated'));
      }
    } catch {
      // ignore
    }
  }

  /**
   * Clear all local session caches.
   */
  static clearLocalState(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
      localStorage.removeItem('ujlog_delegate_session');
      sessionStorage.clear();
      window.dispatchEvent(new Event('ujlog_user_updated'));
      window.dispatchEvent(new Event('ujlog_auth_change'));
    } catch {
      // ignore
    }
  }

  /**
   * Check session with the server.
   * If online: asks `/api/auth/me` as source of truth.
   * If offline: retains cached profile without disconnecting the user.
   */
  static async verifySession(): Promise<{
    authenticated: boolean;
    user: ClientUserProfile | null;
    isOffline: boolean;
    error?: string;
  }> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const cachedProfile = this.getCachedProfile();

    if (!isOnline) {
      // Offline mode: keep local cached session active
      return {
        authenticated: Boolean(cachedProfile && cachedProfile.email),
        user: cachedProfile,
        isOffline: true,
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch('/api/auth/me', {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const payload = await res.json();
        if (payload.success && payload.user) {
          const serverUser = payload.user;
          const mergedProfile: ClientUserProfile = {
            id: serverUser.id,
            email: serverUser.email,
            firstName: serverUser.firstName,
            lastName: serverUser.lastName,
            civility: cachedProfile?.civility,
            level: serverUser.studentProfile?.levelCode || serverUser.delegateProfile?.levelCode || cachedProfile?.level,
            field: serverUser.studentProfile?.fieldCode || serverUser.delegateProfile?.fieldCode || cachedProfile?.field,
            studentId: serverUser.studentProfile?.studentId || cachedProfile?.studentId,
            avatarUrl: cachedProfile?.avatarUrl,
            academicYear: serverUser.studentProfile?.academicYearId || cachedProfile?.academicYear || '2026-2027',
            role: (serverUser.role?.toLowerCase() as any) || 'student',
            isDelegate: Boolean(serverUser.role === 'DELEGATE' || serverUser.delegateProfile),
            delegateScope: serverUser.delegateProfile || undefined,
          };

          this.setCachedProfile(mergedProfile);
          return { authenticated: true, user: mergedProfile, isOffline: false };
        }
      }

      if (res.status === 401 || res.status === 403) {
        // Server revoked or expired session
        this.clearLocalState();
        return { authenticated: false, user: null, isOffline: false, error: 'Session expirée.' };
      }

      // Other HTTP errors (500, etc.) - fallback to cached profile temporarily
      return {
        authenticated: Boolean(cachedProfile && cachedProfile.email),
        user: cachedProfile,
        isOffline: false,
      };
    } catch (err: any) {
      // Network error or timeout - do not kick user out
      const isNetworkIssue = err?.name === 'AbortError' || !navigator.onLine;
      return {
        authenticated: Boolean(cachedProfile && cachedProfile.email),
        user: cachedProfile,
        isOffline: isNetworkIssue,
      };
    }
  }

  /**
   * Log in user with credentials.
   */
  static async login(
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: ClientUserProfile; error?: string; code?: string }> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) {
        return {
          success: false,
          error: payload.error || 'Identifiants invalides ou compte inactif.',
          code: payload.code,
        };
      }

      const serverUser = payload.user;
      const clientProfile: ClientUserProfile = {
        id: serverUser.id,
        email: serverUser.email,
        firstName: serverUser.firstName,
        lastName: serverUser.lastName,
        level: serverUser.studentProfile?.levelCode || serverUser.delegateProfile?.levelCode || 'l2',
        field: serverUser.studentProfile?.fieldCode || serverUser.delegateProfile?.fieldCode || 'tronc_commun',
        studentId: serverUser.studentProfile?.studentId || `ETU-${serverUser.id.slice(0, 6)}`,
        academicYear: serverUser.studentProfile?.academicYearId || '2026-2027',
        role: (serverUser.role?.toLowerCase() as any) || 'student',
        isDelegate: Boolean(serverUser.role === 'DELEGATE' || serverUser.delegateProfile),
        delegateScope: serverUser.delegateProfile || undefined,
      };

      this.setCachedProfile(clientProfile);
      return { success: true, user: clientProfile };
    } catch {
      return {
        success: false,
        error: 'Erreur réseau lors de la connexion. Vérifiez votre connexion Internet.',
      };
    }
  }

  /**
   * Explicit user logout: Revoke session on server, delete cookies, wipe local cache.
   */
  static async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      // ignore network failure
    } finally {
      this.clearLocalState();
      window.location.href = '/login';
    }
  }
}
