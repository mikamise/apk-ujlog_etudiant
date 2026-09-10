-- ============================================================
-- UJLOG Étudiant — Migration 0007
-- Restriction réelle de la lecture des cours au niveau/filière de
-- l'étudiant (Phase 10 — signalé par Arnaud).
--
-- FAILLE TROUVÉE : la policy `courses_read_published` (migration 0001)
-- autorisait la lecture de TOUT cours publié par TOUT utilisateur
-- authentifié, sans jamais vérifier son niveau/filière réels. Le
-- filtrage par niveau (`?level=...`) n'existait que côté requête
-- HTTP/UI — un étudiant de Licence 1 pouvait techniquement consulter et
-- télécharger des cours de Master 2 simplement en changeant l'URL ou en
-- appelant l'API directement.
--
-- Conséquence pratique côté produit (le sujet soulevé) : sans cette
-- restriction, changer le niveau d'un étudiant n'avait aucun effet réel
-- de sécurité — il pouvait de toute façon déjà tout voir. Cette
-- migration fait que la visibilité des cours suit VRAIMENT le niveau
-- courant de l'étudiant en base, donc un changement de niveau a un
-- effet immédiat et réel : accès aux cours du nouveau niveau, perte
-- d'accès à ceux de l'ancien.
--
-- Délégués/admins/super-admins : comportement inchangé (un délégué
-- garde accès à ses propres cours quel que soit leur statut ; un
-- admin+ garde accès à tout).
-- ============================================================

drop policy if exists "courses_read_published" on courses;
create policy "courses_read_published" on courses for select
  using (
    author_id = auth.uid()
    or current_role_at_least('admin')
    or (
      status = 'published'
      and (
        -- Non-étudiant (délégué sans profil étudiant, etc.) : comportement
        -- historique conservé (pas de restriction supplémentaire).
        not exists (select 1 from student_profiles sp where sp.user_id = auth.uid())
        or exists (
          select 1 from student_profiles sp
          where sp.user_id = auth.uid()
            and sp.level_code = courses.level_code
            and sp.field_code = courses.field_code
        )
      )
    )
  );

-- Même principe pour les fichiers rattachés (suivent déjà les droits du
-- cours parent via une sous-requête sur `courses` — donc automatiquement
-- corrigé par la policy ci-dessus, aucun changement nécessaire ici).

-- ============================================================
-- ROLLBACK (manuel) : recréer la policy d'origine, voir migration 0001.
-- ============================================================
