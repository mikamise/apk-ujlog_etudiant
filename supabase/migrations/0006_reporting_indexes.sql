-- ============================================================
-- UJLOG Étudiant — Migration 0006
-- Indexes complémentaires pour les rapports administratifs (Phase 8 §5).
-- Les indexes principaux (année/semestre, niveau/filière, statut)
-- existaient déjà (migration 0001) et couvrent l'essentiel des
-- agrégations d'un rapport annuel. Ceux-ci complètent pour les
-- répartitions par période et par auteur d'action.
-- ============================================================

create index if not exists idx_courses_created_at on courses(created_at);
create index if not exists idx_audit_logs_user on audit_logs(user_id, created_at);

-- ============================================================
-- ROLLBACK (manuel) :
-- drop index idx_courses_created_at;
-- drop index idx_audit_logs_user;
-- ============================================================
