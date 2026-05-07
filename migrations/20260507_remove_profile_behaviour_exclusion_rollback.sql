alter table public.profiles
  add column if not exists exclude_from_writing_behavior boolean not null default false;
