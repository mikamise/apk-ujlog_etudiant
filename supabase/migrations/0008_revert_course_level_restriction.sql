-- ============================================================
-- UJLOG Étudiant — Migration 0008
-- Annulation de la migration 0007 : le niveau ne doit PAS restreindre
-- l'accès aux cours (règle métier clarifiée explicitement par Arnaud).
--
-- RAPPEL DE LA RÈGLE (audit du 5 septembre) :
-- "Le niveau de l'étudiant NE DOIT PAS servir à restreindre l'accès aux
-- cours. Un étudiant inscrit en L2 peut consulter L1, L2, L3, options
-- L3, M1, options M1, M2, options M2. NIVEAU ≠ PERMISSION D'ACCÈS AUX
-- COURS. Le niveau sert principalement à représenter la progression
-- académique et notamment au ciblage des notifications."
--
-- La migration 0007 avait restreint `courses_read_published` au
-- level_code/field_code exact de l'étudiant, sur la base de ce qui était
-- demandé à l'époque. Cette règle est explicitement inversée ici. Le
-- système de progression (Phase "niveau + option") RESTE utile et actif
-- — il continue de déterminer le ciblage des notifications — mais ne
-- conditionne plus la visibilité des cours.
-- ============================================================

drop policy if exists "courses_read_published" on courses;
create policy "courses_read_published" on courses for select
  using (
    status = 'published'
    or author_id = auth.uid()
    or current_role_at_least('admin')
  );

-- ============================================================
-- ROLLBACK (manuel) : réappliquer le contenu de la migration 0007.
-- ============================================================
