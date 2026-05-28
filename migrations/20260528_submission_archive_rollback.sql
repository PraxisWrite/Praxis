-- Rollback for 20260528_submission_archive.sql
--
-- WARNING: dropping this table permanently destroys any archived submission /
-- keystroke data. Export it first if it must be retained.

drop policy if exists "Admins can manage submission archive" on public.submission_archive;
drop table if exists public.submission_archive;
