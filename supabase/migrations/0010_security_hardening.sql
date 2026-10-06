-- ============================================================
-- UJLOG Étudiant — Migration 0010
-- Durcissement sécurité (suite à l'audit du 17/09/2026).
--
--  1. Rate limiting partagé (table + fonction atomique) — remplace
--     les compteurs en mémoire, inefficaces en serverless.
--  2. Compteur de téléchargements atomique.
--  3. Codes d'activation : plus jamais stockés en clair ; RPC non
--     appelable depuis le navigateur ; un admin ne peut pas être
--     rétrogradé en délégué par un code.
--  4. RLS : un compte suspendu (ou révoqué) perd réellement l'accès
--     direct à l'API Supabase ; le catalogue de cours n'est plus
--     lisible sans compte ; impossible de s'auto-créer un profil admin.
--
-- Idempotente autant que possible. ROLLBACK manuel en bas de fichier.
-- ============================================================

-- ============================================================
-- 1. RATE LIMITING PARTAGÉ
-- ============================================================
create table if not exists rate_limits (
  key           text primary key,
  count         int not null default 0,
  window_start  timestamptz not null default now(),
  locked_until  timestamptz
);
create index if not exists idx_rate_limits_window on rate_limits(window_start);

alter table rate_limits enable row level security;
-- Aucune policy : seul le service_role (qui contourne RLS) y accède.

create or replace function rate_limit_hit(
  p_key text,
  p_window_seconds int,
  p_max int,
  p_lockout_seconds int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row rate_limits%rowtype;
  v_now timestamptz := now();
begin
  insert into rate_limits as rl (key, count, window_start)
  values (p_key, 1, v_now)
  on conflict (key) do update
    set count = case
                  when rl.window_start <= v_now - make_interval(secs => p_window_seconds) then 1
                  else rl.count + 1
                end,
        window_start = case
                  when rl.window_start <= v_now - make_interval(secs => p_window_seconds) then v_now
                  else rl.window_start
                end,
        locked_until = case
                  when rl.locked_until is not null and rl.locked_until <= v_now then null
                  else rl.locked_until
                end
  returning * into v_row;

  -- Abus répété (2x la limite dans la fenêtre) : verrouillage temporaire.
  if p_lockout_seconds > 0 and v_row.count >= p_max * 2 and v_row.locked_until is null then
    update rate_limits
      set locked_until = v_now + make_interval(secs => p_lockout_seconds)
      where key = p_key
      returning * into v_row;
  end if;

  -- Nettoyage opportuniste des vieilles entrées (1 appel sur ~200).
  if random() < 0.005 then
    delete from rate_limits
      where window_start < v_now - interval '2 days'
        and (locked_until is null or locked_until < v_now);
  end if;

  return jsonb_build_object(
    'allowed', (v_row.locked_until is null or v_row.locked_until <= v_now) and v_row.count <= p_max,
    'count', v_row.count,
    'reset_at', v_row.window_start + make_interval(secs => p_window_seconds),
    'locked_until', v_row.locked_until
  );
end;
$$;

revoke all on function rate_limit_hit(text, int, int, int) from public, anon, authenticated;
grant execute on function rate_limit_hit(text, int, int, int) to service_role;

-- ============================================================
-- 2. COMPTEUR DE TÉLÉCHARGEMENTS ATOMIQUE
--    (avant : lecture puis écriture de download_count + 1 côté Next.js,
--     deux téléchargements simultanés n'en comptaient qu'un)
-- ============================================================
create or replace function increment_course_download(p_course_id uuid)
returns int
language sql
security definer
set search_path = public
as $$
  update courses
     set download_count = download_count + 1
   where id = p_course_id
  returning download_count;
$$;

revoke all on function increment_course_download(uuid) from public, anon, authenticated;
grant execute on function increment_course_download(uuid) to service_role;

-- ============================================================
-- 3. CODES D'ACTIVATION
-- ============================================================
alter table activation_codes add column if not exists code_hint text;

-- Indice lisible pour l'admin (préfixe uniquement), puis suppression du clair.
update activation_codes
   set code_hint = left(code, length(code) - 4) || '••••'
 where code is not null and code_hint is null;

alter table activation_codes alter column code drop not null;
update activation_codes set code = null where code is not null;

create or replace function redeem_activation_code(
  p_code text,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions -- pgcrypto (digest) est dans "extensions" sur Supabase
as $$
declare
  v_hash text;
  v_code_row record;
  v_user record;
begin
  v_hash := encode(digest(upper(trim(p_code)), 'sha256'), 'hex');

  -- Verrouillage exclusif de la ligne pour éviter toute double activation concurrente
  select * into v_code_row
  from activation_codes
  where code_hash = v_hash
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Code d’activation invalide ou inexistant.');
  end if;

  if v_code_row.status = 'revoked' then
    return jsonb_build_object('success', false, 'error', 'Ce code d’activation a été révoqué par l’administration.');
  end if;

  if v_code_row.status = 'active' or v_code_row.used_by is not null then
    return jsonb_build_object('success', false, 'error', 'Ce code d’activation a déjà été utilisé.');
  end if;

  if v_code_row.expires_at <= now() or v_code_row.status = 'expired' then
    update activation_codes set status = 'expired' where id = v_code_row.id;
    return jsonb_build_object('success', false, 'error', 'Ce code d’activation a expiré.');
  end if;

  select id, email, role, status into v_user from profiles where id = p_user_id;
  if not found or v_user.status <> 'active' then
    return jsonb_build_object('success', false, 'error', 'Compte introuvable ou inactif.');
  end if;

  -- Un admin / super admin ne doit jamais être rétrogradé par un code délégué.
  if v_user.role in ('admin', 'super_admin') then
    return jsonb_build_object('success', false, 'error', 'Ce compte administrateur ne peut pas activer un code délégué.');
  end if;

  update activation_codes
     set status = 'active', used_by = p_user_id, used_at = now()
   where id = v_code_row.id;

  update profiles
     set role = v_code_row.role, updated_at = now()
   where id = p_user_id;

  if v_code_row.role = 'delegate' then
    insert into delegate_profiles (user_id, level_code, field_code, academic_year_id, status, assigned_at)
    values (p_user_id, v_code_row.level_code, v_code_row.field_code, v_code_row.academic_year_id, 'active', now())
    on conflict (user_id, academic_year_id)
    do update set
      level_code = excluded.level_code,
      field_code = excluded.field_code,
      status = 'active',
      assigned_at = now(),
      revoked_at = null,
      revoked_by = null;
  end if;

  insert into audit_logs (user_id, user_email, user_role, action, entity_type, entity_id, target_summary, result, metadata)
  values (
    p_user_id,
    v_user.email,
    v_code_row.role::text,
    'ACTIVATION_CODE_REDEEMED',
    'activation_codes',
    v_code_row.id::text,
    format('Code %s -> rôle %s (%s / %s)', coalesce(v_code_row.code_hint, '••••'), v_code_row.role, v_code_row.level_code, v_code_row.field_code),
    'success',
    jsonb_build_object(
      'role', v_code_row.role,
      'level_code', v_code_row.level_code,
      'field_code', v_code_row.field_code,
      'academic_year_id', v_code_row.academic_year_id
    )
  );

  return jsonb_build_object(
    'success', true,
    'message', 'Félicitations ! Votre code a été activé avec succès.',
    'role', v_code_row.role,
    'levelCode', v_code_row.level_code,
    'fieldCode', v_code_row.field_code,
    'academicYearId', v_code_row.academic_year_id
  );
end;
$$;

-- Avant : fonction SECURITY DEFINER exécutable par tout utilisateur
-- authentifié via /rest/v1/rpc, avec un p_user_id arbitraire.
revoke all on function redeem_activation_code(text, uuid) from public, anon, authenticated;
grant execute on function redeem_activation_code(text, uuid) to service_role;

-- ============================================================
-- 4. RLS — COMPTES ACTIFS UNIQUEMENT
-- ============================================================
create or replace function current_user_is_active()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and status = 'active');
$$;

-- ---- profiles : impossible de s'auto-créer un profil avec un rôle élevé ----
-- (le trigger 0003 ne protège que les UPDATE ; un INSERT direct via
--  PostgREST pouvait créer son propre profil avec role = 'super_admin')
drop policy if exists "profiles_insert_self" on profiles;
create policy "profiles_insert_self" on profiles for insert
  with check (id = auth.uid() and role = 'student' and status = 'active');

-- ---- student_profiles ----
drop policy if exists "student_profiles_select_own_or_staff" on student_profiles;
create policy "student_profiles_select_own_or_staff" on student_profiles for select
  using ((user_id = auth.uid() and current_user_is_active()) or current_role_at_least('delegate'));

drop policy if exists "student_profiles_update_own_or_admin" on student_profiles;
create policy "student_profiles_update_own_or_admin" on student_profiles for update
  using ((user_id = auth.uid() and current_user_is_active()) or current_role_at_least('admin'))
  with check ((user_id = auth.uid() and current_user_is_active()) or current_role_at_least('admin'));

drop policy if exists "student_profiles_insert_self" on student_profiles;
create policy "student_profiles_insert_self" on student_profiles for insert
  with check (user_id = auth.uid() and current_user_is_active());

-- ---- courses : plus de lecture anonyme ; délégué révoqué = plus d'écriture ----
drop policy if exists "courses_read_published" on courses;
create policy "courses_read_published" on courses for select
  using (
    current_role_at_least('admin')
    or (current_user_is_active() and (status = 'published' or author_id = auth.uid()))
  );

drop policy if exists "courses_update_own_or_admin" on courses;
create policy "courses_update_own_or_admin" on courses for update
  using (
    current_role_at_least('admin')
    or (author_id = auth.uid() and current_role_is('delegate') and is_delegate_for(level_code, field_code))
  )
  with check (
    current_role_at_least('admin')
    or (author_id = auth.uid() and current_role_is('delegate') and is_delegate_for(level_code, field_code))
  );

drop policy if exists "courses_delete_own_or_admin" on courses;
create policy "courses_delete_own_or_admin" on courses for delete
  using (
    current_role_at_least('admin')
    or (author_id = auth.uid() and current_role_is('delegate') and is_delegate_for(level_code, field_code))
  );

-- ---- course_files ----
drop policy if exists "course_files_read" on course_files;
create policy "course_files_read" on course_files for select
  using (
    exists (
      select 1 from courses c
      where c.id = course_files.course_id
        and (
          current_role_at_least('admin')
          or (current_user_is_active() and (c.status = 'published' or c.author_id = auth.uid()))
        )
    )
  );

drop policy if exists "course_files_write_owner_or_admin" on course_files;
create policy "course_files_write_owner_or_admin" on course_files for all
  using (
    exists (
      select 1 from courses c
      where c.id = course_files.course_id
        and (
          current_role_at_least('admin')
          or (c.author_id = auth.uid() and current_role_is('delegate') and is_delegate_for(c.level_code, c.field_code))
        )
    )
  )
  with check (
    exists (
      select 1 from courses c
      where c.id = course_files.course_id
        and (
          current_role_at_least('admin')
          or (c.author_id = auth.uid() and current_role_is('delegate') and is_delegate_for(c.level_code, c.field_code))
        )
    )
  );

-- ---- données personnelles ----
drop policy if exists "saved_courses_owner_only" on saved_courses;
create policy "saved_courses_owner_only" on saved_courses for all
  using (user_id = auth.uid() and current_user_is_active())
  with check (user_id = auth.uid() and current_user_is_active());

drop policy if exists "notifications_owner_read" on notifications;
create policy "notifications_owner_read" on notifications for select
  using (user_id = auth.uid() and current_user_is_active());

drop policy if exists "notifications_owner_update" on notifications;
create policy "notifications_owner_update" on notifications for update
  using (user_id = auth.uid() and current_user_is_active())
  with check (user_id = auth.uid() and current_user_is_active());

drop policy if exists "notification_prefs_owner" on notification_preferences;
create policy "notification_prefs_owner" on notification_preferences for all
  using (user_id = auth.uid() and current_user_is_active())
  with check (user_id = auth.uid() and current_user_is_active());

drop policy if exists "device_tokens_owner" on device_tokens;
create policy "device_tokens_owner" on device_tokens for all
  using (user_id = auth.uid() and current_user_is_active())
  with check (user_id = auth.uid() and current_user_is_active());

-- ============================================================
-- ROLLBACK (manuel) :
-- drop function rate_limit_hit(text, int, int, int); drop table rate_limits;
-- drop function increment_course_download(uuid);
-- (codes d'activation : les codes en clair supprimés ne sont pas récupérables)
-- Policies : réappliquer 0001 / 0004 / 0008 et le redeem_activation_code de 0009.
-- drop function current_user_is_active();
-- ============================================================
