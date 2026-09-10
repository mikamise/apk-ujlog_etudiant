import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { getSessionUser, roleAtLeast } from '@/lib/server-session';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/** Liste réelle des années universitaires (jamais de semestre 3, contrainte imposée en base). */
export async function GET(req: NextRequest) {
  const rateLimit = enforceRateLimit(req, 'READ');
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session) return jsonError('Non authentifié.', 401, undefined, req);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('academic_years')
    .select('*, semesters(id, semester_number, name)')
    .order('start_year', { ascending: false });

  if (error) return jsonError('Impossible de récupérer les années universitaires.', 500, undefined, req);
  return jsonSuccess(data ?? []);
}

/** Création d'une nouvelle année universitaire (2 semestres créés automatiquement) — Admin uniquement. */
export async function POST(req: NextRequest) {
  const rateLimit = enforceRateLimit(req, 'ADMIN');
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session || !roleAtLeast(session.profile.role, 'admin')) {
    return jsonError('Accès refusé.', 403, undefined, req);
  }

  const body = await req.json().catch(() => ({}));
  const { id, startYear, endYear } = body;
  if (!id || !startYear || !endYear) {
    return jsonError('id, startYear et endYear sont obligatoires.', 400, undefined, req);
  }

  const admin = createAdminClient();
  const { data: year, error } = await admin
    .from('academic_years')
    .insert({ id, name: `Année Universitaire ${id}`, start_year: startYear, end_year: endYear, status: 'active' })
    .select()
    .single();

  if (error) return jsonError('Impossible de créer cette année universitaire (existe peut-être déjà).', 409, undefined, req);

  // RÈGLE ABSOLUE : toujours exactement 2 semestres, jamais plus.
  await admin.from('semesters').insert([
    { academic_year_id: id, semester_number: 1, name: 'Semestre 1' },
    { academic_year_id: id, semester_number: 2, name: 'Semestre 2' },
  ]);

  await admin.from('audit_logs').insert({
    user_id: session.userId,
    user_email: session.profile.email,
    user_role: session.profile.role,
    action: 'ACADEMIC_YEAR_CREATED',
    entity_type: 'academic_years',
    entity_id: id,
    result: 'success',
  });

  return jsonSuccess(year, undefined, 200, req);
}
