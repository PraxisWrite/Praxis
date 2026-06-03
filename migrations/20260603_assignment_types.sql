-- Org-wide, admin-managed assignment types. These are merged with the built-in
-- BASE_ASSIGNMENT_TYPES on the client so every teacher's "Assignment type"
-- dropdown shows the same shared list. Values are stored lowercased (the app
-- title-cases them for display, exactly like the built-in types).
create table if not exists public.assignment_types (
  id uuid primary key default gen_random_uuid(),
  value text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.assignment_types enable row level security;

-- Any signed-in user may read the shared list (teachers build assignments with
-- it; the chosen value is also stored on each assignment record).
drop policy if exists "assignment_types_select_authenticated" on public.assignment_types;
create policy "assignment_types_select_authenticated"
on public.assignment_types
for select
to authenticated
using (true);

-- Only admins may add or remove shared types. The server endpoints additionally
-- gate these writes with requireAdmin and execute them with the service role.
drop policy if exists "assignment_types_admin_insert" on public.assignment_types;
create policy "assignment_types_admin_insert"
on public.assignment_types
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

drop policy if exists "assignment_types_admin_delete" on public.assignment_types;
create policy "assignment_types_admin_delete"
on public.assignment_types
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);
