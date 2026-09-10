import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Point d'entrée UNIQUE pour notifier un groupe d'étudiants — utilisé par
 * la publication de cours, les annonces délégué et les diffusions admin.
 * Centralise exactement les garanties demandées en Phase 6 :
 *
 * - Le SERVEUR détermine les destinataires (jamais une liste envoyée par
 *   le client) : on interroge student_profiles ici, avec le level_code/
 *   field_code déjà vérifiés par l'appelant AVANT d'appeler cette fonction.
 * - Un seul INSERT groupé pour les notifications internes (pas de boucle).
 * - Les emails ne sont jamais envoyés en boucle synchrone : ils sont
 *   déposés dans `email_queue` (traitée ensuite par lots, voir
 *   /api/cron/dispatch-emails), et uniquement pour les étudiants qui ont
 *   activé les emails dans leurs préférences.
 *
 * `scope: 'all'` diffuse à TOUS les étudiants — c'est un choix explicite
 * de l'appelant (jamais un défaut implicite quand levelCode/fieldCode
 * sont omis, pour éviter toute diffusion accidentelle).
 */
export async function notifyStudentsInScope(
  admin: SupabaseClient,
  params: {
    scope?: 'level' | 'all';
    levelCode?: string;
    fieldCode?: string;
    title: string;
    message: string;
    type: 'course_published' | 'system';
    reference?: Record<string, unknown>;
    emailTemplate?: 'course_published' | 'notification_broadcast';
    emailTemplateData?: Record<string, unknown>;
  }
): Promise<{ notifiedCount: number; emailQueuedCount: number }> {
  const isGeneral = params.scope === 'all';

  if (!isGeneral && (!params.levelCode || !params.fieldCode)) {
    throw new Error('levelCode et fieldCode sont requis sauf en scope "all".');
  }

  let query = admin
    .from('student_profiles')
    .select('user_id, profiles!inner(email), notification_preferences(email_enabled, course_alerts, system_alerts)');

  if (!isGeneral) {
    query = query.eq('level_code', params.levelCode!).eq('field_code', params.fieldCode!);
  }

  const { data: students } = await query;

  const rows = (students ?? []) as unknown as {
    user_id: string;
    profiles: { email: string };
    notification_preferences: { email_enabled: boolean; course_alerts: boolean; system_alerts: boolean } | null;
  }[];

  if (rows.length === 0) return { notifiedCount: 0, emailQueuedCount: 0 };

  // 1. Notifications internes — un seul insert groupé.
  const notifications = rows.map((r) => ({
    user_id: r.user_id,
    title: params.title,
    message: params.message,
    type: params.type,
    reference: params.reference ?? null,
  }));
  const { data: inserted } = await admin.from('notifications').insert(notifications).select('id, user_id');

  // 2. File d'attente d'emails — uniquement pour ceux qui les ont activés,
  //    jamais d'envoi direct ici (voir lib/email.ts + le worker de traitement).
  if (params.emailTemplate) {
    const emailRows = rows
      .filter((r) => {
        // Les préférences n'existent pas encore forcément pour tous les
        // comptes plus anciens : défaut = activé (comportement attendu par
        // notification_preferences côté schéma, cf. migration 0001).
        const prefs = r.notification_preferences;
        if (!prefs) return true;
        if (!prefs.email_enabled) return false;
        return params.type === 'course_published' ? prefs.course_alerts : prefs.system_alerts;
      })
      .map((r) => {
        const notifId = inserted?.find((n: { user_id: string }) => n.user_id === r.user_id)?.id ?? null;
        return {
          notification_id: notifId,
          recipient_email: r.profiles.email,
          template: params.emailTemplate,
          template_data: params.emailTemplateData ?? {},
        };
      });

    if (emailRows.length > 0) {
      await admin.from('email_queue').insert(emailRows);
    }
    return { notifiedCount: rows.length, emailQueuedCount: emailRows.length };
  }

  return { notifiedCount: rows.length, emailQueuedCount: 0 };
}
