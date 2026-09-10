import { NextRequest } from 'next/server';
import { z } from 'zod';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { safeParseAuthBody } from '@/lib/auth-schemas';
import { logSecurityEvent } from '@/lib/security-logger';
import { getSessionUser } from '@/lib/server-session';
import { createClient } from '@/lib/supabase/server';

/**
 * IMPORTANT : n'accepte QUE les champs qu'un étudiant peut légitimement
 * modifier lui-même. `level_code`, `field_code`, `student_id` et
 * `academic_year_id` en sont volontairement absents — ce sont des faits
 * académiques que seul un admin peut changer (voir migration 0003, qui
 * bloque ces colonnes en base même si ce schéma était contourné). L'email
 * n'est pas ici non plus : le changer nécessite un flux de reconfirmation
 * dédié (supabase.auth.updateUser + double confirmation), pas cette route.
 */
const updateProfileSchema = z.object({
  civility: z.enum(['m', 'mme', 'mlle']).optional(),
  firstName: z.string().trim().min(1).max(60).optional(),
  lastName: z.string().trim().min(1).max(60).optional(),
  avatarUrl: z.string().max(4_500_000).optional(), // data-URI base64 (jusqu'à ~3 Mo de fichier source, cf. limite déjà appliquée côté formulaire)
});

export async function PATCH(req: NextRequest) {
  const rateLimit = enforceRateLimit(req, 'WRITE', { discriminator: 'update_student_profile' });
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session) return jsonError('Non authentifié.', 401, undefined, req);
  if (session.profile.role !== 'student') {
    // Les autres rôles n'ont pas de student_profiles ; garde explicite plutôt
    // qu'une erreur SQL opaque si jamais mal utilisée.
    return jsonError('Accès refusé.', 403, undefined, req);
  }

  const body = await req.json().catch(() => ({}));
  const zodCheck = safeParseAuthBody(updateProfileSchema, body);
  if (!zodCheck.success) return jsonError(zodCheck.error, 400, undefined, req);

  const { civility, firstName, lastName, avatarUrl } = zodCheck.data;
  const supabase = await createClient();

  // profiles.first_name / last_name (identité générale)
  if (firstName || lastName) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        ...(firstName ? { first_name: firstName } : {}),
        ...(lastName ? { last_name: lastName } : {}),
      })
      .eq('id', session.userId);
    if (profileError) return jsonError('Mise à jour du profil impossible.', 500, undefined, req);
  }

  // student_profiles.civility / avatar_url (données propres à l'étudiant)
  if (civility || avatarUrl !== undefined) {
    const { error: studentError } = await supabase
      .from('student_profiles')
      .update({
        ...(civility ? { civility } : {}),
        ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : {}),
      })
      .eq('user_id', session.userId);
    if (studentError) return jsonError('Mise à jour du profil impossible.', 500, undefined, req);
  }

  logSecurityEvent({
    eventType: 'PROFILE_UPDATED',
    severity: 'INFO',
    userIdentifier: session.profile.email,
  });

  return jsonSuccess({ updated: true }, undefined, 200, req);
}
