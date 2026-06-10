-- IRB pre-pilot research reporting layer:
-- 1. research_config holds the pseudonym salt (server-side secret, no API access).
-- 2. v_research_process_metrics / v_research_reflections: admin-only export
--    views keyed by a stable per-student pseudonym; rows for test accounts,
--    consent-excluded students, and analytics-excluded analyses are filtered out.
-- 3. research_deletion_log records only the fact/date of withdrawal deletions.
-- 4. Column grants make research/consent flags unreadable for the API roles,
--    so consent status can never surface in teacher- or student-facing reads.

-- ── 1. Pseudonym salt ────────────────────────────────────────
create table public.research_config (
  key text primary key,
  value text not null,
  created_at timestamptz not null default now()
);
comment on table public.research_config is
  'Server-side research secrets (pseudonym salt). No RLS policies and no API grants on purpose: only the service role / owner may read it.';
alter table public.research_config enable row level security;
revoke all on public.research_config from anon, authenticated;

-- Random salt generated inside the database; never appears in code or repo.
insert into public.research_config (key, value)
values ('pseudonym_salt', encode(gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

-- Single source of truth for the salt lookup so the views don't repeat the
-- key literal. SECURITY DEFINER + search_path so it resolves the salt as the
-- owner. Execute must be revoked from PUBLIC (not just anon/authenticated):
-- CREATE FUNCTION grants EXECUTE to PUBLIC by default, and the API roles
-- inherit it through PUBLIC -- otherwise a user token could call it via RPC
-- and recompute pseudonyms. The views still resolve it because they run as
-- the owner, not as the calling role.
create or replace function public.research_pseudonym_salt()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select value from public.research_config where key = 'pseudonym_salt'
$$;
revoke all on function public.research_pseudonym_salt() from public, anon, authenticated;

-- ── 2. Withdrawal deletion log ───────────────────────────────
create table public.research_deletion_log (
  id uuid primary key default gen_random_uuid(),
  deleted_at timestamptz not null default now(),
  submissions_deleted integer not null default 0,
  analyses_deleted integer not null default 0,
  memberships_deleted integer not null default 0
);
comment on table public.research_deletion_log is
  'Audit of research-withdrawal deletions. Deliberately records only the fact, date, and row counts - never which student or which admin.';
alter table public.research_deletion_log enable row level security;
create policy "Admins can read deletion log"
on public.research_deletion_log
for select
to authenticated
using (public.current_user_is_admin());

-- ── 3. Research export views ─────────────────────────────────
-- Stable pseudonym: md5(student_id || salt). Stable across assignments (so
-- assignment-1 vs assignment-2 comparisons work) but cannot be recomputed
-- from the student id without the private salt.
create or replace view public.v_research_process_metrics as
select
  md5(spa.student_id::text || public.research_pseudonym_salt()) as student_pseudonym,
  c.name as class_name,
  a.id as assignment_id,
  a.title as assignment_title,
  s.submitted_at,
  spa.process_status,
  spa.analysis_version,
  spa.calculated_at,
  (spa.metrics->>'typingRate')::numeric as typing_rate,
  (spa.metrics->>'activeMinutes')::numeric as active_minutes,
  (spa.metrics->>'finalWords')::numeric as final_words,
  (spa.metrics->>'finalChars')::numeric as final_chars,
  (spa.metrics->>'draftWords')::numeric as draft_words,
  (spa.metrics->>'insertedChars')::numeric as inserted_chars,
  (spa.metrics->>'removedChars')::numeric as removed_chars,
  (spa.metrics->>'deletionChars')::numeric as deletion_chars,
  (spa.metrics->>'deletionEvents')::numeric as deletion_events,
  (spa.metrics->>'productProcessRatio')::numeric as product_process_ratio,
  (spa.metrics->>'longPauseCount')::numeric as long_pause_count,
  (spa.metrics->>'longPausesPer100w')::numeric as long_pauses_per_100w,
  (spa.metrics->>'meanLongPauseMs')::numeric as mean_long_pause_ms,
  (spa.metrics->>'longPauseMinMs')::numeric as long_pause_min_ms,
  (spa.metrics->>'shortPauseCount')::numeric as short_pause_count,
  (spa.metrics->>'thinkingPauseMaxMs')::numeric as thinking_pause_max_ms,
  (spa.metrics->>'ignoredIdlePauseCount')::numeric as ignored_idle_pause_count,
  (spa.metrics->>'ignoredIdlePauseMs')::numeric as ignored_idle_pause_ms,
  (spa.metrics->>'localRevisions')::numeric as local_revisions,
  (spa.metrics->>'localRevisionsPer100w')::numeric as local_revisions_per_100w,
  (spa.metrics->>'substantiveRevisions')::numeric as substantive_revisions,
  (spa.metrics->>'substantiveRevisionsPer100w')::numeric as substantive_revisions_per_100w,
  (spa.metrics->>'microCorrections')::numeric as micro_corrections,
  (spa.metrics->>'microCorrectionsPer100w')::numeric as micro_corrections_per_100w,
  (spa.metrics->>'meanBurstLength')::numeric as mean_burst_length,
  (spa.metrics->>'pasteShare')::numeric as paste_share,
  (spa.metrics->>'pasteEventCount')::numeric as paste_event_count,
  (spa.metrics->>'externalPasteEventCount')::numeric as external_paste_event_count
from public.submission_process_analyses spa
join public.submissions s on s.id = spa.submission_id
join public.profiles p on p.id = spa.student_id
left join public.assignments a on a.id = spa.assignment_id
left join public.classes c on c.id = spa.class_id
where p.role = 'student'
  and coalesce(p.is_test_account, false) = false
  and coalesce(p.exclude_from_writing_behavior, false) = false
  and coalesce(spa.excluded_from_analytics, false) = false;

create or replace view public.v_research_reflections as
select
  md5(s.student_id::text || public.research_pseudonym_salt()) as student_pseudonym,
  c.name as class_name,
  a.id as assignment_id,
  a.title as assignment_title,
  s.submitted_at,
  s.reflections->>'improved' as reflection_improved,
  s.reflections as reflections_json
from public.submissions s
join public.profiles p on p.id = s.student_id
left join public.assignments a on a.id = s.assignment_id
left join public.classes c on c.id = a.class_id
left join public.submission_process_analyses spa on spa.submission_id = s.id
where p.role = 'student'
  and coalesce(p.is_test_account, false) = false
  and coalesce(p.exclude_from_writing_behavior, false) = false
  and coalesce(spa.excluded_from_analytics, false) = false;

-- The views execute with owner privileges (they bypass RLS), so they must not
-- be readable through the API roles. The server exports them with the service
-- role after its own admin check.
revoke all on public.v_research_process_metrics from anon, authenticated;
revoke all on public.v_research_reflections from anon, authenticated;

-- ── 4. Make research/consent flags invisible to API roles ────
-- profiles: drop table-wide access, re-grant only the columns the app reads
-- under a user token (request-scoped server reads + embedded selects).
-- exclude_from_writing_behavior is readable/writable via service role only.
revoke select, insert, update, delete on table public.profiles from anon, authenticated;
grant select (id, name, role, created_at, is_test_account) on public.profiles to authenticated;

-- submission_process_analyses: same approach; excluded_from_analytics and
-- exclusion_sources stay service-role-only so consent-driven exclusion can
-- never be read with a user token.
revoke select, insert, update, delete on table public.submission_process_analyses from anon, authenticated;
grant select (id, submission_id, assignment_id, class_id, student_id, analysis_version, input_hash, process_status, process_status_label, reason, metrics, timeline, evidence, paste_evidence, cohort_comparison, coach_baseline, calculated_at, created_at, updated_at)
on public.submission_process_analyses to authenticated;
