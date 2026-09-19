-- ============================================================
-- UJLOG Étudiant — Migration 0002
-- Tables de référence académique (niveaux / filières) + intégrité.
--
-- CONTEXTE : jusqu'ici, `level_code` et `field_code` étaient de
-- simples colonnes texte libres sur student_profiles, delegate_profiles,
-- courses et role_invitations, sans aucune contrainte en base — la
-- liste des valeurs valides n'existait que dans le code frontend,
-- dupliquée indépendamment à plusieurs endroits (et donc en dérive :
-- app/api/auth/register/route.ts stockait par ex. "Histoire-Géographie"
-- tel quel au lieu du code "histoire_geographie" utilisé partout
-- ailleurs — un étudiant inscrit avec cette filière ne voyait jamais
-- ses propres cours). Cette migration :
--   1. crée deux tables de référence (source de vérité unique) ;
--   2. les peuple avec les valeurs réellement utilisées dans le code ;
--   3. corrige les lignes existantes dont le code ne correspond à
--      aucune valeur de référence connue (best-effort, voir §3) ;
--   4. ajoute des foreign keys réelles sur les 4 tables concernées.
--
-- Réversible : voir le bloc ROLLBACK en commentaire en bas de fichier.
-- ============================================================

-- ============================================================
-- 1. TABLES DE RÉFÉRENCE
-- ============================================================
create table academic_levels (
  code        text primary key,   -- ex: 'l1', 'l2', 'l3', 'm1', 'm2'
  label       text not null,      -- ex: 'Licence 1'
  sort_order  int not null,
  created_at  timestamptz not null default now()
);

create table academic_fields (
  code        text primary key,   -- ex: 'tronc_commun', 'histoire_geographie'
  label       text not null,      -- ex: 'Histoire-Géographie'
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 2. DONNÉES DE RÉFÉRENCE RÉELLES
--    (valeurs reprises telles quelles des mappings déjà en usage
--     dans components/super-admin/delegates-view.tsx et
--     lib/admin-store.ts — aucune valeur inventée)
-- ============================================================
insert into academic_levels (code, label, sort_order) values
  ('l1', 'Licence 1', 1),
  ('l2', 'Licence 2', 2),
  ('l3', 'Licence 3', 3),
  ('m1', 'Master 1', 4),
  ('m2', 'Master 2', 5);

insert into academic_fields (code, label) values
  ('tronc_commun', 'Tronc commun'),
  ('histoire_geographie', 'Histoire-Géographie'),
  ('histoire', 'Histoire'),
  ('geographie', 'Géographie');

-- ============================================================
-- 3. RÉPARATION DES LIGNES EXISTANTES NON CONFORMES (best-effort)
--    Toute ligne dont le code ne correspond à aucune référence
--    connue est reclassée sur la valeur par défaut la plus sûre,
--    plutôt que de bloquer la migration ou supprimer des données.
--    À VÉRIFIER MANUELLEMENT après coup : `select distinct level_code
--    from student_profiles where level_code not in (select code from
--    academic_levels)` doit renvoyer 0 ligne avant de considérer ceci
--    comme terminé.
-- ============================================================
update student_profiles set field_code = 'tronc_commun'
  where field_code not in (select code from academic_fields);
update student_profiles set level_code = 'l1'
  where level_code not in (select code from academic_levels);

update delegate_profiles set field_code = 'tronc_commun'
  where field_code not in (select code from academic_fields);
update delegate_profiles set level_code = 'l1'
  where level_code not in (select code from academic_levels);

update courses set field_code = 'tronc_commun'
  where field_code not in (select code from academic_fields);
update courses set level_code = 'l1'
  where level_code not in (select code from academic_levels);

update role_invitations set field_code = 'tronc_commun'
  where field_code is not null and field_code not in (select code from academic_fields);
update role_invitations set level_code = 'l1'
  where level_code is not null and level_code not in (select code from academic_levels);

-- ============================================================
-- 4. FOREIGN KEYS RÉELLES (intégrité désormais garantie en base,
--    plus seulement par convention côté frontend)
-- ============================================================
alter table student_profiles
  add constraint fk_student_profiles_level foreign key (level_code) references academic_levels(code) on delete restrict,
  add constraint fk_student_profiles_field foreign key (field_code) references academic_fields(code) on delete restrict;

alter table delegate_profiles
  add constraint fk_delegate_profiles_level foreign key (level_code) references academic_levels(code) on delete restrict,
  add constraint fk_delegate_profiles_field foreign key (field_code) references academic_fields(code) on delete restrict;

alter table courses
  add constraint fk_courses_level foreign key (level_code) references academic_levels(code) on delete restrict,
  add constraint fk_courses_field foreign key (field_code) references academic_fields(code) on delete restrict;

alter table role_invitations
  add constraint fk_role_invitations_level foreign key (level_code) references academic_levels(code) on delete restrict,
  add constraint fk_role_invitations_field foreign key (field_code) references academic_fields(code) on delete restrict;

-- ============================================================
-- 5. RLS — lecture publique authentifiée, écriture admin uniquement
--    (même politique que academic_years / semesters)
-- ============================================================
alter table academic_levels enable row level security;
alter table academic_fields enable row level security;

create policy "academic_levels_read_authenticated" on academic_levels for select
  using (auth.uid() is not null);
create policy "academic_levels_write_admin" on academic_levels for all
  using (current_role_at_least('admin')) with check (current_role_at_least('admin'));

create policy "academic_fields_read_authenticated" on academic_fields for select
  using (auth.uid() is not null);
create policy "academic_fields_write_admin" on academic_fields for all
  using (current_role_at_least('admin')) with check (current_role_at_least('admin'));

-- ============================================================
-- ROLLBACK (à exécuter manuellement en cas de besoin, non automatique) :
--
-- alter table student_profiles drop constraint fk_student_profiles_level, drop constraint fk_student_profiles_field;
-- alter table delegate_profiles drop constraint fk_delegate_profiles_level, drop constraint fk_delegate_profiles_field;
-- alter table courses drop constraint fk_courses_level, drop constraint fk_courses_field;
-- alter table role_invitations drop constraint fk_role_invitations_level, drop constraint fk_role_invitations_field;
-- drop table academic_fields;
-- drop table academic_levels;
-- ============================================================
