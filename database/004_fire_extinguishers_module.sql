-- Migration 004: Fire extinguisher module
-- Run in Supabase SQL Editor after the previous migrations.

create table if not exists public.fire_extinguishers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  extinguisher_type text not null
    check (extinguisher_type in ('water', 'powder', 'co2')),
  location text not null,
  current_status text not null default 'serviceable'
    check (current_status in ('serviceable', 'unserviceable')),
  is_active boolean not null default true,
  notes text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.fire_extinguisher_checks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  fire_extinguisher_id uuid not null references public.fire_extinguishers(id) on delete cascade,
  checked_by_user_id uuid not null references auth.users(id) on delete restrict,
  checked_at timestamptz not null default timezone('utc', now()),
  check_date date not null default current_date,
  status text not null
    check (status in ('serviceable', 'unserviceable')),
  notes text null,
  created_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fire_extinguisher_checks_unique_day'
  ) then
    alter table public.fire_extinguisher_checks
      add constraint fire_extinguisher_checks_unique_day
      unique (organization_id, fire_extinguisher_id, check_date);
  end if;
end
$$;

create index if not exists idx_fire_extinguishers_org_active
  on public.fire_extinguishers(organization_id, is_active, location, name);

create index if not exists idx_fire_extinguisher_checks_org_date
  on public.fire_extinguisher_checks(organization_id, check_date desc);

create index if not exists idx_fire_extinguisher_checks_extinguisher_date
  on public.fire_extinguisher_checks(fire_extinguisher_id, check_date desc);

drop trigger if exists trg_fire_extinguishers_updated_at on public.fire_extinguishers;
create trigger trg_fire_extinguishers_updated_at
before update on public.fire_extinguishers
for each row execute function public.set_updated_at();

create or replace function public.set_fire_extinguisher_check_context()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  extinguisher_org_id uuid;
begin
  select organization_id
  into extinguisher_org_id
  from public.fire_extinguishers
  where id = new.fire_extinguisher_id;

  if extinguisher_org_id is null then
    raise exception 'Fire extinguisher not found';
  end if;

  if new.checked_by_user_id is null then
    new.checked_by_user_id := auth.uid();
  end if;

  if new.checked_at is null then
    new.checked_at := timezone('utc', now());
  end if;

  new.organization_id := extinguisher_org_id;
  return new;
end;
$$;

drop trigger if exists trg_fire_extinguisher_checks_set_context on public.fire_extinguisher_checks;
create trigger trg_fire_extinguisher_checks_set_context
before insert or update on public.fire_extinguisher_checks
for each row execute function public.set_fire_extinguisher_check_context();

create or replace function public.sync_fire_extinguisher_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.fire_extinguishers
  set current_status = new.status
  where id = new.fire_extinguisher_id;

  return new;
end;
$$;

drop trigger if exists trg_fire_extinguisher_checks_sync_status on public.fire_extinguisher_checks;
create trigger trg_fire_extinguisher_checks_sync_status
after insert or update on public.fire_extinguisher_checks
for each row execute function public.sync_fire_extinguisher_status();

alter table public.fire_extinguishers enable row level security;
alter table public.fire_extinguisher_checks enable row level security;

grant select, insert, update, delete on public.fire_extinguishers to authenticated;
grant select, insert, update, delete on public.fire_extinguisher_checks to authenticated;

drop policy if exists fire_extinguishers_select_same_org on public.fire_extinguishers;
create policy fire_extinguishers_select_same_org
on public.fire_extinguishers
for select
to authenticated
using (organization_id = public.current_org_id());

drop policy if exists fire_extinguishers_insert_manager_owner on public.fire_extinguishers;
create policy fire_extinguishers_insert_manager_owner
on public.fire_extinguishers
for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and public.current_user_role() in ('owner', 'manager')
);

drop policy if exists fire_extinguishers_update_manager_owner on public.fire_extinguishers;
create policy fire_extinguishers_update_manager_owner
on public.fire_extinguishers
for update
to authenticated
using (
  organization_id = public.current_org_id()
  and public.current_user_role() in ('owner', 'manager')
)
with check (
  organization_id = public.current_org_id()
  and public.current_user_role() in ('owner', 'manager')
);

drop policy if exists fire_extinguisher_checks_select_same_org on public.fire_extinguisher_checks;
create policy fire_extinguisher_checks_select_same_org
on public.fire_extinguisher_checks
for select
to authenticated
using (organization_id = public.current_org_id());

drop policy if exists fire_extinguisher_checks_insert_all_roles on public.fire_extinguisher_checks;
create policy fire_extinguisher_checks_insert_all_roles
on public.fire_extinguisher_checks
for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and checked_by_user_id = auth.uid()
  and public.current_user_role() in ('owner', 'manager', 'staff')
);
