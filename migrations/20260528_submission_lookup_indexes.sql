-- Submission lookups (roster views, per-assignment grading, per-student history)
-- filter on assignment_id and student_id. Postgres does not auto-create indexes
-- on these columns, so every lookup was a sequential scan — fine at pilot seed
-- size, but it degrades linearly as submissions accumulate (30+ students per
-- assignment across multiple assignments). These two indexes keep those lookups
-- index-backed.
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id
  ON public.submissions (assignment_id);

CREATE INDEX IF NOT EXISTS idx_submissions_student_id
  ON public.submissions (student_id);
