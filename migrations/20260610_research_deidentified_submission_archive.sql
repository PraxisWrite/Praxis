-- IRB pre-pilot: rebuild submission_archive so it can only ever hold
-- de-identified process data.
--
-- The long-term archive keeps ONLY timing/process data (keystroke_log,
-- fluency_summary, derived metrics, timestamps) plus writing_events with all
-- text payloads stripped, under a random non-linkable token. Text/content
-- columns are removed from the schema entirely so they cannot come back by
-- accident. The previous table (20260528) was deliberately emptied on
-- 2026-06-10, so a drop/recreate loses nothing.

drop table if exists public.submission_archive;

create table public.submission_archive (
  id uuid primary key default gen_random_uuid(),
  original_submission_id uuid not null,
  assignment_id uuid,
  class_id uuid,
  -- Random token minted at archive time. Deliberately NOT derived from the
  -- student id (no hash) so the archive cannot be linked back to a person.
  -- One token per student within a single archive batch keeps per-student
  -- grouping; tokens never repeat across batches.
  student_token uuid not null,
  status text,
  -- Revision events with text payloads stripped server-side: only
  -- id/type/timestamp/start/end/delta/flagged survive. insertedText,
  -- removedText and preview are removed from every event before insert.
  writing_events jsonb not null default '[]'::jsonb,
  -- Timing-only events ({at, gap}); carries no text by construction.
  keystroke_log jsonb not null default '[]'::jsonb,
  fluency_summary jsonb not null default '{}'::jsonb,
  -- Derived process metrics copied from submission_process_analyses before
  -- the cascade delete removes the analysis row.
  analysis_version text,
  metrics jsonb not null default '{}'::jsonb,
  original_submitted_at timestamptz,
  original_started_at timestamptz,
  original_updated_at timestamptz,
  archive_reason text not null
    constraint submission_archive_reason_check
    check (archive_reason in ('class_deleted', 'assignment_deleted')),
  archived_at timestamptz not null default now()
);

comment on table public.submission_archive is
  'De-identified writing-process archive (IRB). Holds only timing/process data under a random non-linkable token. Never add columns for student ids, names, archiver ids, or text of student work.';

create index submission_archive_assignment_idx
on public.submission_archive (assignment_id);

create index submission_archive_class_idx
on public.submission_archive (class_id);

create index submission_archive_token_idx
on public.submission_archive (student_token);

create index submission_archive_original_submission_idx
on public.submission_archive (original_submission_id);

alter table public.submission_archive enable row level security;

create policy "Admins can manage submission archive"
on public.submission_archive
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());
