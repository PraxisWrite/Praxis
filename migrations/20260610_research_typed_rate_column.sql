-- Research export: add a paste-excluded typing rate to v_research_process_metrics.
--
-- metrics.typingRate is insertedChars / activeMinutes and deliberately INCLUDES
-- pasted characters: in the teacher-facing review the inflated rate is itself a
-- detection signal (cohort "typing pace above peer range" feeds the verdict).
-- For research the question is genuine composition fluency, so the export gets
-- an additional typed-only rate.
--
-- Approximation note: metrics does not store raw pasted-char counts, so typed
-- chars are reconstructed as insertedChars - pasteShare * finalChars
-- (pasteShare = external pasted chars / finalChars, capped at 1). Own-outline
-- pastes are not counted as pasted text (they are the student's own prior
-- writing). Clamped at 0; NULL when activeMinutes is missing/zero (v1 rows).
--
-- The lateral extracts each metrics key once: the typed-rate expression and the
-- plain columns share the same casts instead of repeating the json key literals.
-- CREATE OR REPLACE VIEW only allows appending columns, so the new column is
-- last; the full select list must be restated.
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
  m.active_minutes,
  (spa.metrics->>'finalWords')::numeric as final_words,
  m.final_chars,
  (spa.metrics->>'draftWords')::numeric as draft_words,
  m.inserted_chars,
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
  m.paste_share,
  (spa.metrics->>'pasteEventCount')::numeric as paste_event_count,
  (spa.metrics->>'externalPasteEventCount')::numeric as external_paste_event_count,
  case
    when coalesce(m.active_minutes, 0) > 0 then
      greatest(0, round(
        (m.inserted_chars - coalesce(m.paste_share, 0) * coalesce(m.final_chars, 0))
        / m.active_minutes
      ))
    else null
  end as typed_chars_per_minute
from public.submission_process_analyses spa
cross join lateral (
  select
    (spa.metrics->>'activeMinutes')::numeric as active_minutes,
    (spa.metrics->>'insertedChars')::numeric as inserted_chars,
    (spa.metrics->>'finalChars')::numeric as final_chars,
    (spa.metrics->>'pasteShare')::numeric as paste_share
) m
join public.submissions s on s.id = spa.submission_id
join public.profiles p on p.id = spa.student_id
left join public.assignments a on a.id = spa.assignment_id
left join public.classes c on c.id = spa.class_id
where p.role = 'student'
  and coalesce(p.is_test_account, false) = false
  and coalesce(p.exclude_from_writing_behavior, false) = false
  and coalesce(spa.excluded_from_analytics, false) = false;

-- Re-assert API lockdown after replace (grants survive replace, but be explicit).
revoke all on public.v_research_process_metrics from anon, authenticated;
