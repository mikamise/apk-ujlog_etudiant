import { createClient, createAdminClient } from '@/lib/supabase/server';

export type SessionProfile = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'student' | 'delegate' | 'admin' | 'super_admin';
  status: 'active' | 'suspended' | 'pending';
  student_profiles?: {
    student_id: string;
    civility: string;
    level_code: string;
    field_code: string;
    academic_year_id: string;
    avatar_url?: string | null;
  } | null;
  delegate_profiles?: {
    level_code: string;
    field_code: string;
    academic_year_id: string;
    status: string;
  } | null;
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
       delegate_profiles ( level_code, field_code, academic_year_id, status )`
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
  const firstName = (meta.first_name || meta.name?.split(' ')[0] || email.split('@')[0] || 'Étudiant').trim();
  const lastName = (meta.last_name || meta.name?.split(' ').slice(1).join(' ') || '').trim();
  const role: SessionProfile['role'] = meta.role || 'student';
  const academicYearId = meta.academic_year_id || '2026-2027';

  // Normalise la civilite pour correspondre a l'enum PostgreSQL ('m' | 'mme' | 'mlle')
  // IMPORTANT: l'enum n'accepte PAS 'M.' avec majuscule ou point
  const rawCivility = (meta.civility || 'm').toLowerCase().replace(/\./g, '').trim();
  const civility: 'm' | 'mme' | 'mlle' = (['m', 'mme', 'mlle'] as const).includes(rawCivility as any)
    ? (rawCivility as 'm' | 'mme' | 'mlle')
    : 'm';

  // S'assurer de la presence de l'annee academique active
  const { error: yearError } = await admin.from('academic_years').upsert(
    {
      id: academicYearId,
      name: `Année Universitaire ${academicYearId}`,
      start_year: 2026,
      end_year: 2027,
      status: 'active',
    },
    { onConflict: 'id', ignoreDuplicates: true }
  );
  if (yearError) console.error('[ensureUserProfile] academic_years upsert failed:', yearError.message);

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

  // Si c'est un étudiant ou un délégué, créer le profil étudiant
  if (role === 'student' || role === 'delegate') {
    const studentId = meta.student_id || `ETU-${user.id.slice(0, 8).toUpperCase()}`;
    const { error: studentError } = await admin.from('student_profiles').upsert(
      {
        user_id: user.id,
        student_id: studentId,
        civility,
        level_code: (meta.level_code || 'l1').toLowerCase(),
        field_code: meta.field_code || 'tronc_commun',
        academic_year_id: academicYearId,
      },
      { onConflict: 'user_id' }
    );
    if (studentError) {
      // Non-bloquant : le profil principal existe, on continue
      console.error('[ensureUserProfile] student_profiles upsert failed:', studentError.message);
    }
  }

  // Re-selectionner le profil complet fraichement cree
  const { data: createdProfile, error: fetchError } = await admin
    .from('profiles')
    .select(
      `id, email, first_name, last_name, role, status,
       student_profiles ( student_id, civility, level_code, field_code, academic_year_id, avatar_url ),
       delegate_profiles ( level_code, field_code, academic_year_id, status )`
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
