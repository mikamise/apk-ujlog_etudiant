-- ============================================================
-- UJLOG Étudiant — Migration 0005
-- File d'attente d'emails ciblés (pattern "outbox") — Phase 6.
--
-- POURQUOI UNE FILE D'ATTENTE ET NON UN ENVOI DIRECT :
-- Envoyer les emails de façon synchrone dans la requête de publication
-- d'un cours (une boucle d'appels à l'API Resend pendant que le délégué
-- attend la réponse) ne passe pas à l'échelle : plus il y a d'étudiants
-- dans le niveau/filière concerné, plus la requête devient lente, avec
-- un risque de timeout côté serveur. Cette table découple la CRÉATION
-- de la notification (rapide, un seul INSERT groupé) de l'ENVOI réel de
-- l'email (traité ensuite, par lots, via /api/cron/dispatch-emails).
--
-- Ne stocke que ce qui est nécessaire à l'envoi — jamais de données
-- personnelles sensibles au-delà de l'email et du contenu du message
-- lui-même (déjà non sensible : titre/texte d'une notification de cours).
-- ============================================================

create type email_queue_status as enum ('pending', 'sent', 'failed');

create table email_queue (
  id              uuid primary key default gen_random_uuid(),
  notification_id uuid references notifications(id) on delete set null,
  recipient_email text not null,
  template        text not null, -- ex: 'course_published', 'notification_broadcast'
  template_data   jsonb not null default '{}',
  status          email_queue_status not null default 'pending',
  attempts        int not null default 0,
  last_error      text,
  created_at      timestamptz not null default now(),
  sent_at         timestamptz
);
create index idx_email_queue_status on email_queue(status, created_at);

-- RLS : uniquement le serveur (service_role) y accède — jamais exposé
-- directement à un utilisateur, ni étudiant, ni délégué, ni admin via
-- une requête PostgREST directe.
alter table email_queue enable row level security;
create policy "email_queue_service_role_only" on email_queue for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- ============================================================
-- ROLLBACK (manuel) :
-- drop table email_queue;
-- drop type email_queue_status;
-- ============================================================
