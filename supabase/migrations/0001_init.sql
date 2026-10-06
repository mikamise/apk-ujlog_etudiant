-- ============================================================
-- UJLOG Étudiant — Schéma Supabase (PostgreSQL) + RLS
-- Remplace l'ancien schéma Prisma. auth.users (Supabase Auth)
-- est la source de vérité pour l'identité ; "profiles" porte
-- les données applicatives liées à chaque utilisateur.
-- ============================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- Enums ----------
create type user_role as enum ('student', 'delegate', 'admin', 'super_admin');
create type user_status as enum ('active', 'suspended', 'pending');
create type civility as enum ('m', 'mme', 'mlle');
create type delegate_status as enum ('active', 'pending', 'revoked');
create type invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');
create type academic_year_status as enum ('active', 'archived');
create type course_type as enum ('cm', 'td', 'tp', 'pv', 'sujet', 'examen_resultat', 'td_resultat');
create type course_status as enum ('draft', 'published', 'archived', 'deleted');
create type notification_type as enum ('account', 'delegate', 'course_published', 'system');
create type audit_result as enum ('success', 'failure', 'info');

-- ---------- helper: updated_at trigger ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 1. PROFILES (1:1 avec auth.users)
-- ============================================================
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text unique not null,
  first_name    text not null,
  last_name     text not null,
  role          user_role not null default 'student',
  status        user_status not null default 'active',
  last_login_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_profiles_role on profiles(role);
create index idx_profiles_status on profiles(status);
create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- ============================================================
-- 2. STRUCTURE ACADÉMIQUE (2 semestres stricts)
-- ============================================================
create table academic_years (
  id           text primary key, -- ex: "2026-2027"
  name         text not null,
  start_year   int not null,
  end_year     int not null,
  status       academic_year_status not null default 'active',
  activated_at timestamptz not null default now(),
  archived_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index idx_academic_years_status on academic_years(status);

create table semesters (
  id               uuid primary key default gen_random_uuid(),
  academic_year_id text not null references academic_years(id) on delete restrict,
  semester_number  int not null check (semester_number in (1, 2)), -- RÈGLE ABSOLUE : jamais de semestre 3
  name             text not null,
  created_at       timestamptz not null default now(),
  unique (academic_year_id, semester_number)
);
create index idx_semesters_year on semesters(academic_year_id);

-- ============================================================
-- 3. PROFILS ÉTUDIANT / DÉLÉGUÉ
-- ============================================================
create table student_profiles (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid unique not null references profiles(id) on delete cascade,
  student_id       text unique not null, -- matricule UJLOG
  civility         civility not null default 'm',
  level_code       text not null, -- l1, l2, l3, m1, m2
  field_code       text not null, -- geo, hist, tronc_commun
  academic_year_id text not null references academic_years(id) on delete restrict,
  avatar_url       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_student_profiles_level on student_profiles(level_code, field_code);
create trigger trg_student_profiles_updated_at before update on student_profiles
  for each row execute function set_updated_at();

create table delegate_profiles (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  level_code       text not null,
  field_code       text not null,
  academic_year_id text not null references academic_years(id) on delete restrict,
  status           delegate_status not null default 'active',
  assigned_at      timestamptz not null default now(),
  revoked_at       timestamptz,
  revoked_by       uuid references profiles(id),
  unique (user_id, academic_year_id)
);
create index idx_delegate_profiles_scope on delegate_profiles(level_code, field_code, academic_year_id);

-- ============================================================
-- 4. INVITATIONS DE RÔLE (remplace les "codes d'activation")
--    Le token n'est JAMAIS stocké en clair : seul son hash l'est.
-- ============================================================
create table role_invitations (
  id                uuid primary key default gen_random_uuid(),
  email             text not null,
  role              user_role not null,
  level_code        text,
  field_code        text,
  academic_year_id  text references academic_years(id),
  token_hash        text unique not null,
  status            invitation_status not null default 'pending',
  invited_by        uuid not null references profiles(id),
  expires_at        timestamptz not null,
  accepted_at       timestamptz,
  accepted_by       uuid references profiles(id),
  revoked_at        timestamptz,
  created_at        timestamptz not null default now()
);
create index idx_role_invitations_email on role_invitations(email);
create index idx_role_invitations_status on role_invitations(status);
create index idx_role_invitations_token_hash on role_invitations(token_hash);

-- ============================================================
-- 5. COURS & FICHIERS
-- ============================================================
create table courses (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text,
  subject_name     text not null,
  type             course_type not null default 'cm',
  academic_year_id text not null references academic_years(id) on delete restrict,
  semester_id      uuid not null references semesters(id) on delete restrict,
  level_code       text not null,
  field_code       text not null,
  teacher_name     text,
  status           course_status not null default 'published',
  author_id        uuid not null references profiles(id) on delete restrict,
  download_count   int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_courses_year_semester on courses(academic_year_id, semester_id);
create index idx_courses_level_field on courses(level_code, field_code);
create index idx_courses_status on courses(status);
create trigger trg_courses_updated_at before update on courses
  for each row execute function set_updated_at();

create table course_files (
  id                  uuid primary key default gen_random_uuid(),
  course_id           uuid not null references courses(id) on delete cascade,
  storage_key         text not null, -- clé Cloudinary
  original_file_name  text not null,
  mime_type           text not null,
  file_size_bytes     bigint not null,
  sha256_checksum     text,
  created_at          timestamptz not null default now()
);
create index idx_course_files_course on course_files(course_id);

create table saved_courses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  course_id  uuid not null references courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);
create index idx_saved_courses_user on saved_courses(user_id);

-- ============================================================
-- 6. NOTIFICATIONS (ciblées, jamais globales par défaut)
-- ============================================================
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete cascade, -- null = notification système large diffusion explicite
  title      text not null,
  message    text not null,
  type       notification_type not null default 'system',
  reference  jsonb, -- ex: { "course_id": "...", "level_code": "l2" }
  is_read    boolean not null default false,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index idx_notifications_user_read on notifications(user_id, is_read);
create index idx_notifications_created on notifications(created_at);

create table notification_preferences (
  user_id           uuid primary key references profiles(id) on delete cascade,
  email_enabled     boolean not null default true,
  push_enabled      boolean not null default true,
  course_alerts     boolean not null default true,
  system_alerts     boolean not null default true,
  updated_at        timestamptz not null default now()
);

create table device_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  token      text unique not null,
  platform   text not null default 'web',
  created_at timestamptz not null default now()
);
create index idx_device_tokens_user on device_tokens(user_id);

-- ============================================================
-- 7. AUDIT LOG IMMUABLE
-- ============================================================
create table audit_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles(id) on delete set null,
  user_email      text,
  user_role       text,
  action          text not null,
  entity_type     text not null,
  entity_id       text,
  target_summary  text,
  result          audit_result not null default 'success',
  metadata        jsonb, -- jamais de mot de passe / token en clair
  created_at      timestamptz not null default now()
);
create index idx_audit_logs_action on audit_logs(action);
create index idx_audit_logs_entity on audit_logs(entity_type, entity_id);
create index idx_audit_logs_created on audit_logs(created_at);

-- ============================================================
-- 8. FONCTIONS D'AUTORISATION (utilisées par les policies RLS)
-- ============================================================
create or replace function current_role_is(target_role user_role)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = target_role and status = 'active'
  );
$$;

create or replace function current_role_at_least(target_role user_role)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and status = 'active'
      and (
        (target_role = 'student') or
        (target_role = 'delegate' and role in ('delegate', 'admin', 'super_admin')) or
        (target_role = 'admin' and role in ('admin', 'super_admin')) or
        (target_role = 'super_admin' and role = 'super_admin')
      )
  );
$$;

create or replace function is_delegate_for(p_level text, p_field text)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from delegate_profiles dp
    join profiles p on p.id = dp.user_id
    where dp.user_id = auth.uid()
      and dp.status = 'active'
      and dp.level_code = p_level
      and dp.field_code = p_field
  );
$$;

-- ============================================================
-- 9. ROW LEVEL SECURITY — DENY BY DEFAULT
-- ============================================================
alter table profiles enable row level security;
alter table student_profiles enable row level security;
alter table delegate_profiles enable row level security;
alter table role_invitations enable row level security;
alter table academic_years enable row level security;
alter table semesters enable row level security;
alter table courses enable row level security;
alter table course_files enable row level security;
alter table saved_courses enable row level security;
alter table notifications enable row level security;
alter table notification_preferences enable row level security;
alter table device_tokens enable row level security;
alter table audit_logs enable row level security;

-- ---- profiles ----
create policy "profiles_select_own_or_admin" on profiles for select
  using (id = auth.uid() or current_role_at_least('admin'));
create policy "profiles_update_own_or_admin" on profiles for update
  using (id = auth.uid() or current_role_at_least('admin'));
create policy "profiles_insert_self" on profiles for insert
  with check (id = auth.uid());

-- ---- student_profiles ----
create policy "student_profiles_select_own_or_staff" on student_profiles for select
  using (user_id = auth.uid() or current_role_at_least('delegate'));
create policy "student_profiles_update_own_or_admin" on student_profiles for update
  using (user_id = auth.uid() or current_role_at_least('admin'));
create policy "student_profiles_insert_self" on student_profiles for insert
  with check (user_id = auth.uid());

-- ---- delegate_profiles ----
create policy "delegate_profiles_select" on delegate_profiles for select
  using (user_id = auth.uid() or current_role_at_least('admin'));
create policy "delegate_profiles_write_admin_only" on delegate_profiles for all
  using (current_role_at_least('admin')) with check (current_role_at_least('admin'));

-- ---- role_invitations : jamais lisible par le grand public, jamais de token en clair exposé ----
create policy "role_invitations_admin_only" on role_invitations for all
  using (current_role_at_least('admin')) with check (current_role_at_least('admin'));

-- ---- academic_years / semesters : lecture publique authentifiée, écriture admin ----
create policy "academic_years_read_authenticated" on academic_years for select
  using (auth.uid() is not null);
create policy "academic_years_write_admin" on academic_years for all
  using (current_role_at_least('admin')) with check (current_role_at_least('admin'));

create policy "semesters_read_authenticated" on semesters for select
  using (auth.uid() is not null);
create policy "semesters_write_admin" on semesters for all
  using (current_role_at_least('admin')) with check (current_role_at_least('admin'));

-- ---- courses : lecture par niveau/filière (tout utilisateur authentifié voit le catalogue publié) ----
create policy "courses_read_published" on courses for select
  using (
    status = 'published'
    or author_id = auth.uid()
    or current_role_at_least('admin')
  );
create policy "courses_insert_delegate_own_scope" on courses for insert
  with check (
    current_role_at_least('admin')
    or (current_role_is('delegate') and is_delegate_for(level_code, field_code))
  );
create policy "courses_update_own_or_admin" on courses for update
  using (
    author_id = auth.uid()
    or current_role_at_least('admin')
  );
create policy "courses_delete_own_or_admin" on courses for delete
  using (
    author_id = auth.uid()
    or current_role_at_least('admin')
  );

-- ---- course_files : suit les droits du cours parent ----
create policy "course_files_read" on course_files for select
  using (
    exists (
      select 1 from courses c
      where c.id = course_files.course_id
        and (c.status = 'published' or c.author_id = auth.uid() or current_role_at_least('admin'))
    )
  );
create policy "course_files_write_owner_or_admin" on course_files for all
  using (
    exists (
      select 1 from courses c
      where c.id = course_files.course_id
        and (c.author_id = auth.uid() or current_role_at_least('admin'))
    )
  );

-- ---- saved_courses (favoris) : strictement personnel ----
create policy "saved_courses_owner_only" on saved_courses for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- notifications : strictement personnel, création par le serveur (service role) ----
create policy "notifications_owner_read" on notifications for select
  using (user_id = auth.uid());
create policy "notifications_owner_update" on notifications for update
  using (user_id = auth.uid());

-- ---- notification_preferences ----
create policy "notification_prefs_owner" on notification_preferences for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- device_tokens ----
create policy "device_tokens_owner" on device_tokens for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- audit_logs : lecture admin uniquement, écriture réservée au service role (aucune policy insert pour les clients) ----
create policy "audit_logs_read_admin" on audit_logs for select
  using (current_role_at_least('admin'));

-- ============================================================
-- 10. DONNÉES DE BASE — AUCUNE DONNÉE FICTIVE
--     (aucun INSERT ici : à créer volontairement depuis
--      l'espace Super Admin une fois l'app en ligne)
-- ============================================================
