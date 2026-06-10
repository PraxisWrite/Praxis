-- Rollback for 20260610_research_deidentified_submission_archive.
-- Restores the pre-IRB archive schema (20260528_submission_archive.sql).
-- WARNING: drops any de-identified rows archived since the migration, and the
-- restored schema stores identifiable text again — only roll back before
-- pilot data exists.

drop table if exists public.submission_archive;

create table public.submission_archive (
  id uuid primary key default gen_random_uuid(),
  original_submission_id uuid not null,
  assignment_id uuid,
  class_id uuid,
  student_id uuid,
  status text,
  draft_text text,
  final_text text,
  chat_history jsonb not null default '[]'::jsonb,
  writing_events jsonb not null default '[]'::jsonb,
  keystroke_log jsonb not null default '[]'::jsonb,
  feedback_history jsonb not null default '[]'::jsonb,
  reflections jsonb not null default '{}'::jsonb,
  outline jsonb not null default '{}'::jsonb,
  self_assessment jsonb not null default '{}'::jsonb,
  teacher_review jsonb not null default '{}'::jsonb,
  fluency_summary jsonb not null default '{}'::jsonb,
  submission_snapshot jsonb not null default '{}'::jsonb,
  original_submitted_at timestamptz,
  original_started_at timestamptz,
  original_updated_at timestamptz,
  archive_reason text not null,
  archived_by uuid,
  archived_at timestamptz not null default now(),
  constraint submission_archive_reason_check
    check (archive_reason in ('class_deleted', 'assignment_deleted'))
);

create index submission_archive_assignment_idx
on public.submission_archive (assignment_id);

create index submission_archive_class_idx
on public.submission_archive (class_id);

create index submission_archive_student_idx
on public.submission_archive (student_id);

create index submission_archive_original_submission_idx
on public.submission_archive (original_submission_id);

alter table public.submission_archive enable row level security;

create policy "Admins can manage submission archive"
on public.submission_archive
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());
