-- Adds a per-assignment toggle: when on, the student draft page auto-generates
-- an editable idea-outline drawn from the coach planning chat.
alter table public.assignments
  add column if not exists auto_outline_from_chat boolean not null default false;

comment on column public.assignments.auto_outline_from_chat is
  'When true, the student draft page auto-generates an editable idea-outline from the coach chat.';
