-- ============================================================
-- UJLOG Étudiant — Migration 0004
-- Défense en profondeur sur course_files (Phase 5).
--
-- Contrairement à profiles/student_profiles (migration 0003), la policy
-- `course_files_write_owner_or_admin` n'avait pas de faille active : sa
-- clause USING valide déjà directement la colonne sensible (course_id)
-- et PostgreSQL la réutilise comme WITH CHECK implicite. Mais la rendre
-- explicite documente l'intention et protège si la policy est modifiée
-- plus tard sans qu'on y repense.
-- ============================================================

drop policy if exists "course_files_write_owner_or_admin" on course_files;
create policy "course_files_write_owner_or_admin" on course_files for all
  using (
    exists (
      select 1 from courses c
      where c.id = course_files.course_id
        and (c.author_id = auth.uid() or current_role_at_least('admin'))
    )
  )
  with check (
    exists (
      select 1 from courses c
      where c.id = course_files.course_id
        and (c.author_id = auth.uid() or current_role_at_least('admin'))
    )
  );

-- ============================================================
-- ROLLBACK (manuel) : recréer la policy sans la clause with check
-- (voir migration 0001 pour la définition d'origine).
-- ============================================================
