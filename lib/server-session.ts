import { createClient, createAdminClient } from '@/lib/supabase/server';

import { CURRENT_ACADEMIC_YEAR_ID } from '@/lib/academic-year';

/** Année universitaire courante — voir lib/academic-year.ts (NEXT_PUBLIC_CURRENT_ACADEMIC_YEAR). */
export { CURRENT_ACADEMIC_YEAR_ID };

type AdminClient = ReturnType<typeof createAdminClient>;

/** 'Monsieur' | 'M.' | 'm' -> 'm' ; 'Madame' | 'Mme' -> 'mme' ; 'Mademoiselle' | 'Mlle' -> 'mlle'. */
export function normalizeCivility(raw: unknown): 'm' | 'mme' | 'mlle' {
  const v = String(raw ?? '').toLowerCase().replace(/\./g, '').trim();
  if (v === 'mme' || v === 'madame') return 'mme';
  if (v === 'mlle' || v === 'mademoiselle') return 'mlle';
  return 'm';
}

/**
 * Garantit que l'année universitaire existe AVEC ses 2 semestres (un cours
 * exige un semester_id : une année sans semestres rend toute publication
 * impossible). Idempotent.
 */
export async function ensureAcademicYear(admin: AdminClient, academicYearId: string): Promise<void> {
  const match = /^(\d{4})-(\d{4})$/.exec(academicYearId);
  const startYear = match ? Number(match[1]) : new Date().getFullYear();
  const endYear = match ? Number(match[2]) : startYear + 1;

  const { error: yearError } = await admin.from('academic_years').upsert(
    {
      id: academicYearId,
      name: `Année Universitaire ${academicYearId}`,
      start_year: startYear,
      end_year: endYear,
      status: 'active',
    },
    { onConflict: 'id', ignoreDuplicates: true }
  );
  if (yearError) console.error('[ensureAcademicYear] academic_years upsert failed:', yearError.message);

  const { error: semError } = await admin.from('semesters').upsert(
    [
      { academic_year_id: academicYearId, semester_number: 1, name: 'Semestre 1' },
      { academic_year_id: academicYearId, semester_number: 2, name: 'Semestre 2' },
    ],
    { onConflict: 'academic_year_id,semester_number', ignoreDuplicates: true }
  );
  if (semError) console.error('[ensureAcademicYear] semesters upsert failed:', semError.message);
}

export type StudentProfileRow = {
  student_id: string;
  civility: string;
  level_code: string;
  field_code: string;
  academic_year_id: string;
  avatar_url?: string | null;
};

export type DelegateProfileRow = {
  level_code: string;
  field_code: string;
  academic_year_id: string;
  status: string;
};

export type SessionProfile = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'student' | 'delegate' | 'admin' | 'super_admin';
  status: 'active' | 'suspended' | 'pending';
  student_profiles?: StudentProfileRow | StudentProfileRow[] | null;
  delegate_profiles?: DelegateProfileRow | DelegateProfileRow[] | null;
};

/**
 * Garantit qu'un profil applicatif existe pour un utilisateur Supabase Auth.
 * Si le profil a été omis ou n'a pas été créé lors de l'inscription (ou créé via Supabase dashboard),
 * cette fonction l'auto-provisionne avec le client admin pour débloquer l'accès sans faille.
 */
export async function ensureUserProfile(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any>;
}): Promise<SessionProfile | null> {
  const admin = createAdminClient();

  // 1. Recherche du profil avec le client admin (contourne RLS)
  const { data: profile, error: selectError } = await admin
    .from('profiles')
    .select(
      `id, email, first_name, last_name, role, status,
       student_profiles ( student_id, civility, level_code, field_code, academic_year_id, avatar_url ),
       delegate_profiles!user_id ( level_code, field_code, academic_year_id, status )`
    )
    .eq('id', user.id)
    .maybeSingle();

  if (selectError) {
    console.error('[ensureUserProfile] initial profile fetch error:', selectError.message);
  }

  if (profile) {
    return profile as unknown as SessionProfile;
  }

  // 2. Profil absent : auto-provisioning robuste
  const meta = user.user_metadata || {};
  const email = (user.email || '').trim().toLowerCase();
  const firstName = String(meta.first_name || meta.name?.split(' ')[0] || email.split('@')[0] || 'Étudiant').trim();
  const lastName = String(meta.last_name || meta.name?.split(' ').slice(1).join(' ') || '').trim();
  // SÉCURITÉ : le rôle n'est JAMAIS lu depuis user_metadata (modifiable par
  // l'utilisateur lui-même via l'API Supabase publique). Un profil créé
  // automatiquement est toujours "student" ; les rôles supérieurs passent
  // exclusivement par invitation / code d'activation.
  const role: SessionProfile['role'] = 'student';
  const academicYearId = CURRENT_ACADEMIC_YEAR_ID;

  const civility = normalizeCivility(meta.civility);

  await ensureAcademicYear(admin, academicYearId);

  // Inserer le profil applicatif principal
  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      role,
      status: 'active',
    },
    { onConflict: 'id' }
  );
  if (profileError) {
    console.error('[ensureUserProfile] profiles upsert failed:', profileError.message);
    return null;
  }

  const studentId = `ETU-${user.id.slice(0, 8).toUpperCase()}`;
  const { error: studentError } = await admin.from('student_profiles').upsert(
    {
      user_id: user.id,
      student_id: studentId,
      civility,
      level_code: 'l1',
      field_code: 'tronc_commun',
      academic_year_id: academicYearId,
    },
    { onConflict: 'user_id' }
  );
  if (studentError) {
    // Non-bloquant : le profil principal existe, on continue
    console.error('[ensureUserProfile] student_profiles upsert failed:', studentError.message);
  }

  // Re-selectionner le profil complet fraichement cree
  const { data: createdProfile, error: fetchError } = await admin
    .from('profiles')
    .select(
      `id, email, first_name, last_name, role, status,
       student_profiles ( student_id, civility, level_code, field_code, academic_year_id, avatar_url ),
       delegate_profiles!user_id ( level_code, field_code, academic_year_id, status )`
    )
    .eq('id', user.id)
    .maybeSingle();

  if (fetchError) {
    console.error('[ensureUserProfile] final profile fetch failed:', fetchError.message);
  }

  return (createdProfile as unknown as SessionProfile) || null;
}

/**
 * Récupère l'utilisateur authentifié ET son profil applicatif, en une
 * seule vérification côté serveur. Retourne null si aucune session
 * valide n'existe — chaque route doit gérer ce cas en renvoyant 401.
 */
export async function getSessionUser(): Promise<{ userId: string; profile: SessionProfile } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await ensureUserProfile(user);

  if (!profile || profile.status !== 'active') return null;

  return { userId: user.id, profile };
}

/** Hiérarchie de rôle : renvoie true si le rôle courant a AU MOINS le niveau requis. */
export function roleAtLeast(role: SessionProfile['role'], required: SessionProfile['role']): boolean {
  const order: SessionProfile['role'][] = ['student', 'delegate', 'admin', 'super_admin'];
  return order.indexOf(role) >= order.indexOf(required);
}

type RawDelegateProfile = DelegateProfileRow;

/**
 * `delegate_profiles` n'est unique que sur (user_id, academic_year_id) :
 * PostgREST renvoie donc un TABLEAU. On retient la ligne active la plus
 * pertinente (année courante en priorité).
 */
export function pickDelegateProfile(raw: unknown): RawDelegateProfile | null {
  const rows = (Array.isArray(raw) ? raw : raw ? [raw] : []) as RawDelegateProfile[];
  const active = rows.filter((r) => r.status === 'active');
  return (
    active.find((r) => r.academic_year_id === CURRENT_ACADEMIC_YEAR_ID) ||
    active[0] ||
    rows[0] ||
    null
  );
}

/**
 * Format unique renvoyé au navigateur par /api/auth/login et /api/auth/me.
 * Les sous-profils exposent les clés camelCase (lues par
 * lib/client-auth-service.ts) ET snake_case (lues par l'espace délégué),
 * pour rester compatible avec tout le code client existant.
 */
export function serializeSessionUser(profile: SessionProfile) {
  const sp = Array.isArray(profile.student_profiles)
    ? (profile.student_profiles[0] ?? null)
    : profile.student_profiles ?? null;
  const dp = pickDelegateProfile(profile.delegate_profiles);

  return {
    id: profile.id,
    email: profile.email,
    firstName: profile.first_name,
    lastName: profile.last_name,
    role: profile.role,
    status: profile.status,
    studentProfile: sp
      ? {
          ...sp,
          studentId: sp.student_id,
          civility: sp.civility,
          levelCode: sp.level_code,
          fieldCode: sp.field_code,
          academicYearId: sp.academic_year_id,
          avatarUrl: sp.avatar_url ?? null,
        }
      : null,
    delegateProfile:
      dp && dp.status === 'active'
        ? {
            ...dp,
            levelCode: dp.level_code,
            fieldCode: dp.field_code,
            academicYearId: dp.academic_year_id,
          }
        : null,
  };
}

/**
 * Profil délégué ACTIF de l'utilisateur (année courante en priorité).
 * Ne lève jamais d'erreur si plusieurs lignes existent (une par année),
 * contrairement à `.maybeSingle()` utilisé auparavant.
 */
export async function getActiveDelegateProfile(
  admin: AdminClient,
  userId: string
): Promise<DelegateProfileRow | null> {
  const { data } = await admin
    .from('delegate_profiles')
    .select('level_code, field_code, academic_year_id, status')
    .eq('user_id', userId)
    .eq('status', 'active');
  return pickDelegateProfile(data ?? []);
}
