'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

/**
 * Store en mémoire (jamais localStorage) des cours sauvegardés de l'utilisateur.
 * Source de vérité réelle = table Supabase `saved_courses`, via /api/favorites.
 * On ne garde en mémoire que la correspondance courseId -> id de ligne
 * (nécessaire pour l'appel DELETE /api/favorites/{id}), le temps de la session.
 */
let savedMap: Record<string, string> = {}; // courseId -> saved_courses.id
let hasFetched = false;
let isFetching = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((cb) => cb());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return savedMap;
}

function getServerSnapshot() {
  return savedMap;
}

async function ensureLoaded() {
  if (hasFetched || isFetching) return;
  isFetching = true;
  try {
    const res = await fetch('/api/favorites');
    const payload = await res.json().catch(() => null);
    if (payload?.success && Array.isArray(payload.data)) {
      const next: Record<string, string> = {};
      for (const row of payload.data as { id: string; courses: { id: string } | null }[]) {
        if (row.courses?.id) next[String(row.courses.id)] = String(row.id);
      }
      savedMap = next;
      hasFetched = true;
      emit();
    }
  } catch {
    // Hors ligne ou erreur réseau : on retentera au prochain appel.
  } finally {
    isFetching = false;
  }
}

export function useSavedCourses() {
  const map = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    ensureLoaded();
  }, []);

  const isSaved = useCallback((id: string) => Boolean(map[id]), [map]);

  const toggleSave = useCallback(async (courseId: string) => {
    const existingRowId = savedMap[courseId];

    if (existingRowId) {
      // Retrait optimiste, avec rollback en cas d'échec réel.
      const rollback = { ...savedMap };
      const next = { ...savedMap };
      delete next[courseId];
      savedMap = next;
      emit();
      try {
        const res = await fetch(`/api/favorites/${existingRowId}`, { method: 'DELETE' });
        const payload = await res.json().catch(() => null);
        if (!payload?.success) {
          savedMap = rollback;
          emit();
        }
      } catch {
        savedMap = rollback;
        emit();
      }
    } else {
      // Ajout optimiste avec un id temporaire, remplacé par le vrai id renvoyé par Supabase.
      const rollback = { ...savedMap };
      const tempId = `temp-${courseId}`;
      savedMap = { ...savedMap, [courseId]: tempId };
      emit();
      try {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId }),
        });
        const payload = await res.json().catch(() => null);
        if (payload?.success && payload.data?.id) {
          savedMap = { ...savedMap, [courseId]: String(payload.data.id) };
          emit();
        } else {
          savedMap = rollback;
          emit();
        }
      } catch {
        savedMap = rollback;
        emit();
      }
    }
  }, []);

  return { isSaved, toggleSave, isLoaded: hasFetched };
}
