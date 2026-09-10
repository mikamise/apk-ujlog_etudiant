import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { getSessionUser, roleAtLeast } from '@/lib/server-session';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Clôture d'une année universitaire : passe son statut à "archived".
 * Ne supprime AUCUNE donnée (règle absolue de conservation des historiques).
 */
export async function POST(req: NextRequest) {
  const rateLimit = enforceRateLimit(req, 'ADMIN');
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session || !roleAtLeast(session.profile.role, 'admin')) {
    return jsonError('Accès refusé.', 403, undefined, req);
  }

  const { academicYearId } = await req.json().catch(() => ({}));
  if (!academicYearId) return jsonError('academicYearId est obligatoire.', 400, undefined, req);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('academic_years')
    .update({ status: 'archived', archived_at: new Date().toISOString() })
    .eq('id', academicYearId)
    .select()
    .single();

  if (error || !data) return jsonError('Année universitaire introuvable.', 404, undefined, req);

  await admin.from('audit_logs').insert({
    user_id: session.userId,
    user_email: session.profile.email,
    user_role: session.profile.role,
    action: 'ACADEMIC_YEAR_ARCHIVED',
    entity_type: 'academic_years',
    entity_id: academicYearId,
    result: 'success',
  });

  return jsonSuccess(data, undefined, 200, req);
}

/**
 * Restauration d'une année archivée (repasse son statut à "active").
 * Ne restaure QUE le statut de l'année — ne modifie jamais les profils
 * étudiants ni ne déplace quoi que ce soit d'une autre année.
 */
export async function PATCH(req: NextRequest) {
  const rateLimit = enforceRateLimit(req, 'ADMIN');
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session || !roleAtLeast(session.profile.role, 'admin')) {
    return jsonError('Accès refusé.', 403, undefined, req);
  }

  const { academicYearId } = await req.json().catch(() => ({}));
  if (!academicYearId) return jsonError('academicYearId est obligatoire.', 400, undefined, req);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('academic_years')
    .update({ status: 'active', archived_at: null })
    .eq('id', academicYearId)
    .select()
    .single();

  if (error || !data) return jsonError('Année universitaire introuvable.', 404, undefined, req);

  await admin.from('audit_logs').insert({
    user_id: session.userId,
    user_email: session.profile.email,
    user_role: session.profile.role,
    action: 'ACADEMIC_YEAR_RESTORED',
    entity_type: 'academic_years',
    entity_id: academicYearId,
    result: 'success',
  });

  return jsonSuccess(data, undefined, 200, req);
}

/**
 * Rapport d'une année (comptages réels) ET, si `list=true`, la liste
 * effective des cours de cette année — filtrable par niveau/filière.
 * Avant, seuls des compteurs globaux étaient renvoyés : impossible de
 * réellement parcourir les cours archivés par niveau/option malgré les
 * filtres déjà présents côté interface.
 */
export async function GET(req: NextRequest) {
  const rateLimit = enforceRateLimit(req, 'ADMIN');
  if (rateLimit) return rateLimit;

  const session = await getSessionUser();
  if (!session || !roleAtLeast(session.profile.role, 'admin')) {
    return jsonError('Accès refusé.', 403, undefined, req);
  }

  const { searchParams } = new URL(req.url);
  const academicYearId = searchParams.get('academicYearId');
  const levelCode = searchParams.get('levelCode') || undefined;
  const fieldCode = searchParams.get('fieldCode') || undefined;
  const wantsList = searchParams.get('list') === 'true';
  if (!academicYearId) return jsonError('academicYearId est requis.', 400, undefined, req);

  const admin = createAdminClient();

  if (wantsList) {
    let query = admin
      .from('courses')
      .select('id, title, type, level_code, field_code, status, download_count, created_at')
      .eq('academic_year_id', academicYearId)
      .order('created_at', { ascending: false });
    if (levelCode) query = query.eq('level_code', levelCode);
    if (fieldCode) query = query.eq('field_code', fieldCode);

    const { data: coursesList, error } = await query;
    if (error) return jsonError('Impossible de récupérer les cours archivés.', 500, undefined, req);
    return jsonSuccess({ courses: coursesList ?? [] }, undefined, 200, req);
  }

  const [{ count: coursesCount }, { data: courses }, { count: studentsCount }] = await Promise.all([
    admin.from('courses').select('id', { count: 'exact', head: true }).eq('academic_year_id', academicYearId),
    admin.from('courses').select('download_count').eq('academic_year_id', academicYearId),
    admin.from('student_profiles').select('id', { count: 'exact', head: true }).eq('academic_year_id', academicYearId),
  ]);

  const totalDownloads = (courses ?? []).reduce((sum: number, c: { download_count: number }) => sum + (c.download_count || 0), 0);

  return jsonSuccess(
    {
      academicYearId,
      studentsCount: studentsCount ?? 0,
      coursesCount: coursesCount ?? 0,
      totalDownloads,
    },
    undefined,
    200,
    req
  );
}
