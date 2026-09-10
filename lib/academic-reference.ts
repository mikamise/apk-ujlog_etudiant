/**
 * Référence académique canonique — SOURCE UNIQUE.
 *
 * Ces libellés/codes existaient déjà, dupliqués indépendamment dans
 * plusieurs fichiers (components/super-admin/delegates-view.tsx,
 * lib/admin-store.ts, lib/security-validator.ts). Ce module les
 * regroupe pour que toute nouvelle conversion libellé -> code passe
 * par un seul et même mapping, garanti cohérent avec la table de
 * référence `academic_levels` / `academic_fields` (migration 0002).
 */

export const LEVEL_LABEL_TO_CODE: Record<string, string> = {
  'Licence 1': 'l1',
  'Licence 2': 'l2',
  'Licence 3': 'l3',
  'Master 1': 'm1',
  'Master 2': 'm2',
};

export const FIELD_LABEL_TO_CODE: Record<string, string> = {
  'Tronc commun': 'tronc_commun',
  'Histoire-Géographie': 'histoire_geographie',
  Histoire: 'histoire',
  Géographie: 'geographie',
};

export const LEVEL_CODE_TO_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(LEVEL_LABEL_TO_CODE).map(([label, code]) => [code, label])
);
export const FIELD_CODE_TO_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(FIELD_LABEL_TO_CODE).map(([label, code]) => [code, label])
);

export function normalizeLevelCode(label: unknown): { isValid: boolean; levelCode: string } {
  const str = String(label ?? '').trim();
  const found = Object.keys(LEVEL_LABEL_TO_CODE).find(
    (l) => l.toLowerCase() === str.toLowerCase()
  );
  if (found) return { isValid: true, levelCode: LEVEL_LABEL_TO_CODE[found] };
  return { isValid: false, levelCode: 'l1' };
}

export function normalizeFieldCode(label: unknown): { isValid: boolean; fieldCode: string } {
  const str = String(label ?? '').trim();
  const found = Object.keys(FIELD_LABEL_TO_CODE).find(
    (f) => f.toLowerCase() === str.toLowerCase()
  );
  if (found) return { isValid: true, fieldCode: FIELD_LABEL_TO_CODE[found] };
  return { isValid: false, fieldCode: 'tronc_commun' };
}

/**
 * Progression académique — un étudiant avance d'un seul palier à la fois
 * (jamais de saut, ex. L1 → M2 interdit). L1/L2 sont en tronc commun
 * (pas de choix). À partir de L3, une option/spécialité devient
 * obligatoire — c'est un des 3 champs déjà existants dans
 * FIELD_LABEL_TO_CODE (histoire_geographie/histoire/geographie), jamais
 * une valeur inventée. M1 permet de conserver ou reconfirmer l'option ;
 * M2 la conserve automatiquement.
 */
export const LEVEL_PROGRESSION_ORDER = ['l1', 'l2', 'l3', 'm1', 'm2'] as const;
export type ProgressionLevel = (typeof LEVEL_PROGRESSION_ORDER)[number];

/** Codes d'option réels (hors tronc commun) — jamais de valeur inventée ici. */
export const OPTION_FIELD_CODES = ['histoire_geographie', 'histoire', 'geographie'] as const;

/** Niveaux où une option doit être choisie ou reconfirmée en progressant VERS ce niveau. */
export const LEVELS_REQUIRING_OPTION = new Set<ProgressionLevel>(['l3', 'm1']);

export function getNextLevel(currentLevelCode: string): ProgressionLevel | null {
  const idx = LEVEL_PROGRESSION_ORDER.indexOf(currentLevelCode as ProgressionLevel);
  if (idx === -1 || idx === LEVEL_PROGRESSION_ORDER.length - 1) return null;
  return LEVEL_PROGRESSION_ORDER[idx + 1];
}
