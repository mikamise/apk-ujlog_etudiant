'use client';

import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useSyncExternalStore,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { DelegateScope, UserRole } from '@/lib/delegate-types';
import { ClientAuthService, sanitizeProfileForCache, PROFILE_STORAGE_KEY } from '@/lib/client-auth-service';

export interface UserProfile {
  id?: string;
  civility: string;
  lastName: string;
  firstName: string;
  email: string;
  level: string;
  field: string;
  avatarUrl?: string;
  academicYear?: string;
  studentId?: string;
  role?: UserRole;
  isDelegate?: boolean;
  delegateScope?: DelegateScope;
}

export const EMPTY_PROFILE: UserProfile = {
  civility: '',
  lastName: '',
  firstName: '',
  email: '',
  level: 'l2',
  field: 'tronc_commun',
  avatarUrl: '',
  academicYear: '2026-2027',
  studentId: '',
  role: 'student',
  isDelegate: false,
};

export const STORAGE_KEY = PROFILE_STORAGE_KEY;

interface UserContextType {
  user: UserProfile;
  isAuthenticated: boolean;
  isDelegate: boolean;
  isOffline: boolean;
  isLoading: boolean;
  isMounted: boolean;
  updateUser: (updatedData: Partial<UserProfile>) => void;
  updateAvatar: (avatarDataUrl: string) => void;
  activateDelegateRole: (scope: DelegateScope) => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

function subscribeStorage(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener('ujlog_user_updated', callback);
  window.addEventListener('ujlog_auth_change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('ujlog_user_updated', callback);
    window.removeEventListener('ujlog_auth_change', callback);
  };
}

function getUserSnapshot(): string {
  if (typeof window === 'undefined') return '';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved || '';
  } catch {
    return '';
  }
}

function getUserServerSnapshot(): string {
  return '';
}

function subscribeMounted() {
  return () => {};
}

export function useIsMounted() {
  return useSyncExternalStore(
    subscribeMounted,
    () => true,
    () => false
  );
}

export function UserProvider({ children }: { children: ReactNode }) {
  const isMounted = useIsMounted();
  const [isVerifying, setIsVerifying] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  const rawUserJson = useSyncExternalStore(
    subscribeStorage,
    getUserSnapshot,
    getUserServerSnapshot
  );

  const user = useMemo<UserProfile>(() => {
    if (!rawUserJson) return EMPTY_PROFILE;
    try {
      const parsed = JSON.parse(rawUserJson);
      const clean = sanitizeProfileForCache(parsed);
      return clean && clean.email
        ? {
            id: clean.id,
            civility: clean.civility || '',
            lastName: clean.lastName || '',
            firstName: clean.firstName || '',
            email: clean.email,
            level: clean.level || 'l2',
            field: clean.field || 'tronc_commun',
            avatarUrl: clean.avatarUrl || '',
            academicYear: clean.academicYear || '2026-2027',
            studentId: clean.studentId || '',
            role: clean.role || 'student',
            isDelegate: Boolean(clean.isDelegate),
            delegateScope: clean.delegateScope as any,
          }
        : EMPTY_PROFILE;
    } catch {
      return EMPTY_PROFILE;
    }
  }, [rawUserJson]);

  // Session verification on launch & online recovery
  const verifyCurrentSession = useCallback(async () => {
    if (typeof window === 'undefined') return;

    if (!navigator.onLine) {
      setIsOffline(true);
      setIsVerifying(false);
      return;
    }

    try {
      const result = await ClientAuthService.verifySession();
      setIsOffline(result.isOffline);
    } catch {
      // Keep offline resilience
      setIsOffline(!navigator.onLine);
    } finally {
      setIsVerifying(false);
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;

    const runCheck = async () => {
      if (typeof window === 'undefined') return;

      if (!navigator.onLine) {
        if (isSubscribed) {
          setIsOffline(true);
          setIsVerifying(false);
        }
        return;
      }

      try {
        const result = await ClientAuthService.verifySession();
        if (isSubscribed) {
          setIsOffline(result.isOffline);
        }
      } catch {
        if (isSubscribed) {
          setIsOffline(!navigator.onLine);
        }
      } finally {
        if (isSubscribed) {
          setIsVerifying(false);
        }
      }
    };

    runCheck();

    const handleOnline = () => {
      setIsOffline(false);
      runCheck();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isSubscribed = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updateUser = useCallback((updatedData: Partial<UserProfile>) => {
    if (typeof window === 'undefined') return;
    try {
      const current = ClientAuthService.getCachedProfile();
      const base: UserProfile = current
        ? {
            id: current.id,
            civility: current.civility || '',
            lastName: current.lastName || '',
            firstName: current.firstName || '',
            email: current.email,
            level: current.level || 'l2',
            field: current.field || 'tronc_commun',
            avatarUrl: current.avatarUrl,
            academicYear: current.academicYear || '2026-2027',
            studentId: current.studentId || '',
            role: current.role as any,
            isDelegate: Boolean(current.isDelegate),
            delegateScope: current.delegateScope as any,
          }
        : EMPTY_PROFILE;

      const merged: UserProfile = {
        ...base,
        ...updatedData,
      };
      ClientAuthService.setCachedProfile(merged as any);
    } catch (err) {
      console.error('Erreur sauvegarde profil', err);
    }
  }, []);

  const activateDelegateRole = useCallback(
    (scope: DelegateScope) => {
      updateUser({
        role: 'delegate',
        isDelegate: true,
        delegateScope: scope,
      });
    },
    [updateUser]
  );

  const updateAvatar = useCallback(
    (avatarDataUrl: string) => {
      updateUser({ avatarUrl: avatarDataUrl });
    },
    [updateUser]
  );

  const logout = useCallback(async () => {
    await ClientAuthService.logout();
  }, []);

  const isAuthenticated = Boolean(user && user.email && user.email.trim().length > 0);
  const isDelegate = Boolean(user && (user.role === 'delegate' || user.isDelegate));
  const isLoading = !isMounted || (isVerifying && !isAuthenticated);

  return (
    <UserContext.Provider
      value={{
        user,
        isAuthenticated,
        isDelegate,
        isOffline,
        isLoading,
        isMounted,
        updateUser,
        updateAvatar,
        activateDelegateRole,
        logout,
        refreshSession: verifyCurrentSession,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
