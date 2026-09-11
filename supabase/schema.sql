-- Shared state for the NPI Setup Checklist.
-- Run this once in Supabase Dashboard > SQL Editor.

create table if not exists public.npi_checklist_state (
  id text primary key,
  tasks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_npi_checklist_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_npi_checklist_updated_at on public.npi_checklist_state;
create trigger set_npi_checklist_updated_at
before insert or update on public.npi_checklist_state
for each row execute function public.set_npi_checklist_updated_at();

alter table public.npi_checklist_state enable row level security;

drop policy if exists "Team can read checklist" on public.npi_checklist_state;
create policy "Team can read checklist"
  on public.npi_checklist_state for select
  using (true);

drop policy if exists "Team can create checklist" on public.npi_checklist_state;
create policy "Team can create checklist"
  on public.npi_checklist_state for insert
  with check (true);

drop policy if exists "Team can update checklist" on public.npi_checklist_state;
create policy "Team can update checklist"
  on public.npi_checklist_state for update
  using (true)
  with check (true);

alter table public.npi_checklist_state replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'npi_checklist_state'
  ) then
    alter publication supabase_realtime add table public.npi_checklist_state;
  end if;
end
$$;
