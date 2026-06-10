-- Rollback for 20260610_research_views_and_withdrawal_log.
-- Restores table-wide API grants and removes the research reporting layer.
-- NOTE: rolling this back re-exposes profiles.exclude_from_writing_behavior
-- and submission_process_analyses.exclusion_sources to authenticated reads —
-- do not run while consent-excluded pilot students exist.

drop view if exists public.v_research_process_metrics;
drop view if exists public.v_research_reflections;
drop table if exists public.research_deletion_log;
drop table if exists public.research_config;

grant select, insert, update, delete on table public.profiles to anon, authenticated;
grant select, insert, update, delete on table public.submission_process_analyses to anon, authenticated;
