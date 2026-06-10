# Research data layer (IRB pilot)

Praxis is entering a research pilot **pending IRB approval** (classes are
running now as normal coursework; research data collection starts only on
approval). This document describes the data-layer guarantees that back the
IRB protocol, added 2026-06-10.

> **Out of scope, do not build:** any linking between survey codes and app
> accounts. The research surveys are deliberately a separate, unlinkable
> channel — if a feature request ever implies joining them, flag it instead
> of building it.

## 1. De-identified archive (`submission_archive`)

When a teacher deletes a class or assignment, submissions are snapshotted
into `public.submission_archive` before the hard delete
(`archiveSubmissionsForDeletion` in `server.js`). Per the IRB protocol the
long-term archive holds **only de-identified process data**:

- Kept: `keystroke_log` (timing-only `{at, gap}`, whitelisted), `fluency_summary`,
  `metrics` + `analysis_version` (copied from the linked
  `submission_process_analyses` row before the cascade delete removes it),
  original timestamps, status, assignment/class ids.
- `writing_events` are stripped per event to
  `id/type/timestamp/start/end/delta/flagged` — `insertedText`,
  `removedText`, `preview` (and everything else) never reach the archive
  (`stripWritingEventsForArchive` in `submission-sanitizer.js`).
- `student_id` is replaced by `student_token`: a **random UUID minted at
  archive time**, never derived from the student id (no hash), so the archive
  cannot be linked back to a person. One token per student per archive batch
  preserves within-batch grouping; tokens never repeat across batches.
- The schema has **no columns** for text content (`draft_text`,
  `final_text`, `chat_history`, `reflections`, `outline`, `self_assessment`,
  `teacher_review`, `feedback_history`, `submission_snapshot`) or for
  `archived_by` — removed in `20260610_research_deidentified_submission_archive.sql`
  so identifiable data cannot come back by accident.

## 2. Research exports (admin only)

Two SQL views (created in `20260610_research_views_and_withdrawal_log.sql`)
feed CSV downloads in the admin panel ("Research data exports"):

- `v_research_process_metrics` — one row per analyzed submission: stable
  pseudonym, class name, assignment id/title, `submitted_at`, and all
  flattened metric keys (typing rate, long pauses, local revisions,
  product/process ratio ≈ text survival, paste/bulk-insert share, …).
- `v_research_reflections` — pseudonym, class, assignment, `submitted_at`,
  `reflections.improved` (+ raw reflections JSON) for thematic coding.
  **Chat history is not exported** — out of protocol scope.

Both views exclude rows where any of these is true:
`profiles.is_test_account`, `profiles.exclude_from_writing_behavior`,
`submission_process_analyses.excluded_from_analytics`.

**Pseudonym**: `md5(student_id || salt)` where the salt is a random value in
`public.research_config` (`pseudonym_salt`), generated inside the database by
the migration and readable only by the service role/owner. Stable across
assignments (enables within-student assignment-1 vs assignment-2 comparison)
but not recomputable from the student id alone. The CSV endpoints abort if
the pseudonym comes back NULL (missing salt) so identities are never
substituted.

Endpoints (`requireAdmin`, service-role reads):
`GET /api/admin/research/process-metrics.csv`,
`GET /api/admin/research/reflections.csv`.
The views themselves are revoked from `anon`/`authenticated` — a teacher
token cannot query them (they could otherwise infer consent status from
missing rows).

## 3. Consent exclusion (`profiles.exclude_from_writing_behavior`)

Set by the PI for non-consenting students via the admin class detail
("Exclude from research data"). Guarantees:

- **Propagates**: it is an exclusion source (`profile_exclusion`) in
  `submission_process_analyses.excluded_from_analytics`, the flag is part of
  the analysis input hash (flipping it marks analyses stale for recompute),
  research views filter on it directly, and the admin CEFR benchmarks pool
  excludes flagged students.
- **Invisible to teachers and students**:
  - stripped from every profile API response (`sanitizeProfileForClient`);
  - `profile_exclusion` is stripped from analysis responses for non-admin
    viewers, and `excludedFromAnalytics` is recomputed without it, so the
    teacher UI renders identically for consenting and non-consenting
    students (`sanitizeProcessAnalysisForViewer`);
  - column-level grants: `authenticated` cannot SELECT
    `profiles.exclude_from_writing_behavior` nor
    `submission_process_analyses.excluded_from_analytics`/`exclusion_sources`
    through PostgREST at all (and can no longer UPDATE profiles directly).
    The server reads/writes these columns with the service role only.
- **No app-experience change**: exclusion only tags analytics rows; the
  analyzer, coach, grading, and student flows are untouched.

## 4. Withdrawal deletion

`DELETE /api/admin/research/students/:studentId/data` (admin only, also a
button in the admin class detail): hard-deletes the student's submissions
(cascades to analyses/labels), residual process analyses, and class
memberships while the data is still identifiable, **bypassing the archive**.
It refuses `P1-S*` accounts (retained pseudonymized Phase 1 dataset).
`public.research_deletion_log` records only the fact, date, and row counts —
never which student or which admin.

## 5. Do not touch

- Accounts `P1-S01…P1-S27` — de-identified Phase 1 students, retained
  deliberately as pseudonymized dev data.
- Test accounts; the pilot class "AWG 1001".
- `submission_archive` was deliberately emptied on 2026-06-10 before the
  schema rebuild.
