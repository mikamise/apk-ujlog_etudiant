import { createClient } from '@/lib/supabase/server';

export type SessionProfile = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'student' | 'delegate' | 'admin' | 'super_admin';
  status: 'active' | 'suspended' | 'pending';
};

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, role, status')
    .eq('id', user.id)
    .single();

  if (!profile || profile.status !== 'active') return null;

  return { userId: user.id, profile: profile as SessionProfile };
}

/** Hiérarchie de rôle : renvoie true si le rôle courant a AU MOINS le niveau requis. */
export function roleAtLeast(role: SessionProfile['role'], required: SessionProfile['role']): boolean {
  const order: SessionProfile['role'][] = ['student', 'delegate', 'admin', 'super_admin'];
  return order.indexOf(role) >= order.indexOf(required);
}
