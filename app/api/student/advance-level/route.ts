import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { getSessionUser } from '@/lib/server-session';
import { createAdminClient } from '@/lib/supabase/server';
import {
  getNextLevel,
  LEVELS_REQUIRING_OPTION,
  OPTION_FIELD_CODES,
} from '@/lib/academic-reference';

/**
 * "Passer au niveau supérieur" — action étudiante contrôlée.
 *
 * SÉCURITÉ : contrairement à un champ librement éditable, cette route
 * NE permet JAMAIS de choisir un niveau arbitraire. Elle calcule
 * elle-même le SEUL niveau suivant valide à partir du niveau réel de
 * l'étudiant en base (jamais depuis le payload), et refuse tout saut
 * (ex. impossible de passer directement de L1 à M2). C'est la même
 * philosophie que la restriction de périmètre des délégués (Phase 6) :
 * le serveur décide, jamais le client.
 *
 * Utilise le client service_role — la migration 0003 (qui empêche un
 * étudiant de changer lui-même son niveau via un appel direct à
 * l'API Supabase) exempte explicitement les appels service_role,
 * précisément pour permettre CETTE route contrôlée, qui applique elle-
 * même la règle métier avant d'écrire quoi que ce soit.
 */
export async function POST(req: NextRequest) {
  const rateLimit = enforceRateLimit(req, 'WRITE', { discriminator: 'advance_level' });
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session) return jsonError('Non authentifié.', 401, undefined, req);
  if (session.profile.role !== 'student') return jsonError('Accès refusé.', 403, undefined, req);

  const admin = createAdminClient();
  const { data: studentProfile } = await admin
    .from('student_profiles')
    .select('level_code, field_code')
    .eq('user_id', session.userId)
    .maybeSingle();

  if (!studentProfile) return jsonError('Profil étudiant introuvable.', 404, undefined, req);

  const nextLevel = getNextLevel(studentProfile.level_code);
  if (!nextLevel) {
    return jsonError('Vous êtes déjà à votre dernier niveau (Master 2).', 400, undefined, req);
  }

  const update: { level_code: string; field_code?: string } = { level_code: nextLevel };

  if (LEVELS_REQUIRING_OPTION.has(nextLevel)) {
    const body = await req.json().catch(() => ({}));
    const optionFieldCode = String(body.optionFieldCode || '');
    if (!OPTION_FIELD_CODES.includes(optionFieldCode as (typeof OPTION_FIELD_CODES)[number])) {
      return jsonError(
        'Une option/spécialité valide est obligatoire pour ce palier.',
        400,
        undefined,
        req
      );
    }
    update.field_code = optionFieldCode;
  }
  // Pour M2 (pas dans LEVELS_REQUIRING_OPTION) : l'option déjà choisie en
  // L3/M1 est automatiquement conservée — field_code n'est pas modifié.

  const { data: updated, error } = await admin
    .from('student_profiles')
    .update(update)
    .eq('user_id', session.userId)
    .select('level_code, field_code')
    .single();

  if (error || !updated) return jsonError('Impossible de mettre à jour votre niveau.', 500, undefined, req);

  await admin.from('audit_logs').insert({
    user_id: session.userId,
    user_email: session.profile.email,
    user_role: session.profile.role,
    action: 'STUDENT_LEVEL_ADVANCED',
    entity_type: 'student_profiles',
    entity_id: session.userId,
    result: 'success',
    metadata: {
      fromLevel: studentProfile.level_code,
      toLevel: updated.level_code,
      fieldCode: updated.field_code,
    },
  });

  return jsonSuccess(updated, undefined, 200, req);
}
