-- ============================================================
-- UJLOG Étudiant — Migration 0003
-- Verrouillage des colonnes sensibles en auto-modification.
--
-- FAILLE TROUVÉE PENDANT L'AUDIT PHASE 4 :
-- Les policies RLS `profiles_update_own_or_admin` et
-- `student_profiles_update_own_or_admin` n'avaient qu'une clause
-- USING, pas de WITH CHECK. En PostgreSQL, une policy UPDATE sans
-- WITH CHECK réutilise USING pour valider la ligne APRÈS
-- modification — qui ne vérifie que "id = auth.uid()", jamais QUELLES
-- colonnes sont modifiées.
--
-- Conséquence concrète : n'importe quel étudiant authentifié pouvait
-- appeler directement l'API REST Supabase (PostgREST — accessible
-- depuis le navigateur avec la clé anon publique + son propre JWT,
-- SANS PASSER par les routes Next.js /api/*) et exécuter l'équivalent de :
--
--   UPDATE profiles SET role = 'super_admin' WHERE id = auth.uid();
--   UPDATE student_profiles SET level_code = 'm2', field_code = 'histoire' WHERE user_id = auth.uid();
--
-- La RLS l'aurait autorisé. C'est exactement le scénario d'attaque
-- "étudiant → modification rôle" que la Phase 4 demande de tester —
-- et il aurait réussi.
--
-- CORRECTION : un trigger BEFORE UPDATE (le mécanisme robuste pour
-- comparer l'ancienne et la nouvelle valeur d'une colonne, ce qu'un
-- simple WITH CHECK ne permet pas nativement) qui lève une exception
-- si une colonne sensible change ET que l'auteur de la requête n'est
-- ni admin+, ni la connexion service_role utilisée par le serveur
-- Next.js (ces routes-là font déjà leur propre vérification de rôle
-- AVANT d'atteindre la base — voir lib/server-session.ts).
-- ============================================================

create or replace function prevent_profiles_self_escalation()
returns trigger language plpgsql security definer as $$
begin
  -- Les appels serveur via la clé service_role (déjà vérifiés côté
  -- Next.js dans chaque route /api/admin/*) ne sont jamais bloqués ici.
  if auth.role() = 'service_role' then
    return new;
  end if;

  if (new.role is distinct from old.role or new.status is distinct from old.status)
     and not current_role_at_least('admin') then
    raise exception 'Modification du rôle ou du statut non autorisée.' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_profiles_self_escalation on profiles;
create trigger trg_prevent_profiles_self_escalation
  before update on profiles
  for each row execute function prevent_profiles_self_escalation();

create or replace function prevent_student_profile_self_reassignment()
returns trigger language plpgsql security definer as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if (
    new.level_code is distinct from old.level_code or
    new.field_code is distinct from old.field_code or
    new.student_id is distinct from old.student_id or
    new.academic_year_id is distinct from old.academic_year_id
  ) and not current_role_at_least('admin') then
    raise exception 'Modification du niveau, de la filière, du matricule ou de l’année académique non autorisée.' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_student_profile_self_reassignment on student_profiles;
create trigger trg_prevent_student_profile_self_reassignment
  before update on student_profiles
  for each row execute function prevent_student_profile_self_reassignment();

-- ============================================================
-- Même faille structurelle sur delegate_profiles ? Non : sa policy
-- d'écriture (`delegate_profiles_write_admin_only`) exige déjà
-- current_role_at_least('admin') aussi bien en USING qu'en WITH CHECK
-- (`for all ... using (...) with check (...)`), donc un délégué ne
-- peut de toute façon pas modifier sa propre ligne du tout. Vérifié,
-- rien à corriger ici.
-- ============================================================

-- ============================================================
-- ROLLBACK (manuel) :
-- drop trigger trg_prevent_profiles_self_escalation on profiles;
-- drop function prevent_profiles_self_escalation();
-- drop trigger trg_prevent_student_profile_self_reassignment on student_profiles;
-- drop function prevent_student_profile_self_reassignment();
-- ============================================================
