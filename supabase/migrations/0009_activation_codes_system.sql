-- ============================================================
-- UJLOG Étudiant — Migration 0009
-- Système complet de codes d'activation (Phase 5)
--
-- CONTEXTE :
-- Les délégués et administrateurs peuvent désormais être invités
-- ou activés soit par e-mail direct, soit par un code d'activation
-- généré et traçable en base (ex: DEL-L1-A8F29K).
--
-- GARANTIES DE SÉCURITÉ :
-- 1. Un code est à usage unique (status = 'active' après utilisation).
-- 2. Verrouillage atomique contre les race conditions : deux requêtes
--    simultanées ne peuvent jamais activer le même code.
-- 3. Validation des dates d'expiration (expires_at > now()).
-- 4. Traçabilité complète (créé par, utilisé par, horodatages).
-- 5. RLS deny by default : consultation/création admin uniquement.
-- ============================================================

-- ---------- 1. Table activation_codes ----------
create table if not exists activation_codes (
  id                uuid primary key default gen_random_uuid(),
  code              text unique not null,
  code_hash         text unique not null,
  role              user_role not null default 'delegate',
  level_code        text not null references academic_levels(code) on delete restrict,
  field_code        text not null references academic_fields(code) on delete restrict,
  academic_year_id  text not null references academic_years(id) on delete restrict,
  status            text not null default 'pending' check (status in ('pending', 'active', 'expired', 'revoked')),
  expires_at        timestamptz not null,
  created_by        uuid not null references profiles(id) on delete cascade,
  used_by           uuid references profiles(id) on delete set null,
  used_at           timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists idx_activation_codes_code on activation_codes(code);
create index if not exists idx_activation_codes_hash on activation_codes(code_hash);
create index if not exists idx_activation_codes_status on activation_codes(status);
create index if not exists idx_activation_codes_scope on activation_codes(level_code, field_code, academic_year_id);

-- ---------- 2. Fonction d'activation atomique (Race-condition safe) ----------
create or replace function redeem_activation_code(
  p_code text,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_clean_code text;
  v_code_row record;
  v_user_email text;
begin
  v_clean_code := upper(trim(p_code));

  -- Verrouillage exclusif de la ligne du code pour éviter les accès concurrents simultanés
  select * into v_code_row
  from activation_codes
  where upper(code) = v_clean_code
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
    -- Mise à jour automatique du statut en expiré
    update activation_codes set status = 'expired' where id = v_code_row.id;
    return jsonb_build_object('success', false, 'error', 'Ce code d’activation a expiré.');
  end if;

  -- Récupérer l'e-mail de l'utilisateur pour l'audit
  select email into v_user_email from profiles where id = p_user_id;

  -- 1. Marquer le code comme utilisé
  update activation_codes
  set status = 'active',
      used_by = p_user_id,
      used_at = now()
  where id = v_code_row.id;

  -- 2. Mettre à jour le profil de l'utilisateur avec le nouveau rôle
  update profiles
  set role = v_code_row.role,
      updated_at = now()
  where id = p_user_id;

  -- 3. Si rôle délégué, créer ou activer son profil délégué
  if v_code_row.role = 'delegate' then
    insert into delegate_profiles (user_id, level_code, field_code, academic_year_id, status, assigned_at)
    values (p_user_id, v_code_row.level_code, v_code_row.field_code, v_code_row.academic_year_id, 'active', now())
    on conflict (user_id, academic_year_id)
    do update set
      level_code = excluded.level_code,
      field_code = excluded.field_code,
      status = 'active',
      revoked_at = null,
      revoked_by = null;
  end if;

  -- 4. Journaliser dans audit_logs
  insert into audit_logs (
    user_id,
    user_email,
    user_role,
    action,
    entity_type,
    entity_id,
    target_summary,
    result,
    metadata
  )
  values (
    p_user_id,
    v_user_email,
    v_code_row.role::text,
    'ACTIVATION_CODE_REDEEMED',
    'activation_codes',
    v_code_row.id::text,
    format('Activation code %s -> rôle %s (%s / %s)', v_code_row.code, v_code_row.role, v_code_row.level_code, v_code_row.field_code),
    'success',
    jsonb_build_object(
      'code', v_code_row.code,
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

-- ---------- 3. Politiques RLS ----------
alter table activation_codes enable row level security;

-- Seuls les administrateurs et super-administrateurs peuvent consulter et créer des codes
create policy "activation_codes_admin_all" on activation_codes for all
  using (current_role_at_least('admin'))
  with check (current_role_at_least('admin'));
