-- Multi-tenant HACCP schema (restaurant-first)
-- Run this script in Supabase SQL Editor as a single migration.

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('owner', 'manager', 'staff');
  end if;

  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type public.subscription_status as enum ('active', 'trial', 'past_due');
  end if;

  if not exists (select 1 from pg_type where typname = 'equipment_type') then
    create type public.equipment_type as enum ('fridge', 'freezer', 'room');
  end if;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  org_code text not null unique,
  subscription_status public.subscription_status not null default 'trial',
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role public.app_role not null default 'staff',
  username text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, username)
);

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  type public.equipment_type not null,
  min_temp numeric(5,2) not null,
  max_temp numeric(5,2) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint equipment_temp_range_valid check (min_temp <= max_temp)
);

create table if not exists public.haccp_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  recorded_temp numeric(5,2) not null,
  recorded_at timestamptz not null default timezone('utc', now()),
  user_id uuid not null references auth.users(id) on delete restrict,
  corrective_action text null,
  is_out_of_range boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.incoming_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  date date not null default current_date,
  supplier text not null,
  invoice_number text not null,
  items_json jsonb not null default '[]'::jsonb,
  image_url text null,
  user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.personal_hygiene_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  check_date date not null default current_date,
  notes text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.facility_hygiene_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  check_date date not null default current_date,
  area text not null,
  notes text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_profiles_org on public.profiles(organization_id);
create index if not exists idx_profiles_org_role_active on public.profiles(organization_id, role, is_active);
create index if not exists idx_equipment_org on public.equipment(organization_id);
create index if not exists idx_haccp_logs_org on public.haccp_logs(organization_id);
create index if not exists idx_haccp_logs_equipment on public.haccp_logs(equipment_id);
create index if not exists idx_haccp_logs_recorded_at on public.haccp_logs(recorded_at desc);
create index if not exists idx_incoming_logs_org on public.incoming_logs(organization_id);
create index if not exists idx_personal_hygiene_logs_org on public.personal_hygiene_logs(organization_id);
create index if not exists idx_facility_hygiene_logs_org on public.facility_hygiene_logs(organization_id);

create or replace function public.normalize_org_code()
returns trigger
language plpgsql
as $$
begin
  new.org_code := lower(trim(new.org_code));
  return new;
end;
$$;

drop trigger if exists trg_organizations_normalize_org_code on public.organizations;
create trigger trg_organizations_normalize_org_code
before insert or update on public.organizations
for each row execute function public.normalize_org_code();

create or replace function public.normalize_username()
returns trigger
language plpgsql
as $$
begin
  new.username := lower(trim(new.username));
  return new;
end;
$$;

drop trigger if exists trg_profiles_normalize_username on public.profiles;
create trigger trg_profiles_normalize_username
before insert or update on public.profiles
for each row execute function public.normalize_username();

drop trigger if exists trg_organizations_updated_at on public.organizations;
create trigger trg_organizations_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_equipment_updated_at on public.equipment;
create trigger trg_equipment_updated_at
before update on public.equipment
for each row execute function public.set_updated_at();

drop trigger if exists trg_haccp_logs_updated_at on public.haccp_logs;
create trigger trg_haccp_logs_updated_at
before update on public.haccp_logs
for each row execute function public.set_updated_at();

drop trigger if exists trg_incoming_logs_updated_at on public.incoming_logs;
create trigger trg_incoming_logs_updated_at
before update on public.incoming_logs
for each row execute function public.set_updated_at();

drop trigger if exists trg_personal_hygiene_logs_updated_at on public.personal_hygiene_logs;
create trigger trg_personal_hygiene_logs_updated_at
before update on public.personal_hygiene_logs
for each row execute function public.set_updated_at();

drop trigger if exists trg_facility_hygiene_logs_updated_at on public.facility_hygiene_logs;
create trigger trg_facility_hygiene_logs_updated_at
before update on public.facility_hygiene_logs
for each row execute function public.set_updated_at();

create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.organization_id
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true
  limit 1
$$;

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true
  limit 1
$$;

grant execute on function public.current_org_id() to authenticated;
grant execute on function public.current_user_role() to authenticated;

create or replace function public.create_organization_with_owner(
  p_owner_user_id uuid,
  p_name text,
  p_org_code text,
  p_owner_username text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  insert into public.organizations (name, org_code, subscription_status, owner_id)
  values (trim(p_name), lower(trim(p_org_code)), 'trial', p_owner_user_id)
  returning id into v_org_id;

  insert into public.profiles (id, organization_id, role, username, is_active)
  values (p_owner_user_id, v_org_id, 'owner', lower(trim(p_owner_username)), true);

  return v_org_id;
end;
$$;

revoke all on function public.create_organization_with_owner(uuid, text, text, text) from public;
grant execute on function public.create_organization_with_owner(uuid, text, text, text) to service_role;

create or replace function public.set_haccp_log_org_and_severity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  eq_org uuid;
  eq_min numeric(5,2);
  eq_max numeric(5,2);
begin
  select e.organization_id, e.min_temp, e.max_temp
  into eq_org, eq_min, eq_max
  from public.equipment e
  where e.id = new.equipment_id;

  if eq_org is null then
    raise exception 'Equipment not found';
  end if;

  if new.user_id is null then
    new.user_id := auth.uid();
  end if;

  if new.recorded_at is null then
    new.recorded_at := timezone('utc', now());
  end if;

  new.organization_id := eq_org;
  new.is_out_of_range := (new.recorded_temp < eq_min or new.recorded_temp > eq_max);
  return new;
end;
$$;

drop trigger if exists trg_haccp_logs_set_org_and_severity on public.haccp_logs;
create trigger trg_haccp_logs_set_org_and_severity
before insert or update on public.haccp_logs
for each row execute function public.set_haccp_log_org_and_severity();

create or replace function public.enforce_staff_limit_5()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_staff_count integer;
begin
  if new.role = 'staff' and new.is_active = true then
    select count(*)
    into active_staff_count
    from public.profiles p
    where p.organization_id = new.organization_id
      and p.role = 'staff'
      and p.is_active = true
      and p.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

    if active_staff_count >= 5 then
      raise exception 'Staff limit reached (max 5 active staff users per organization)';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_enforce_staff_limit on public.profiles;
create trigger trg_profiles_enforce_staff_limit
before insert or update on public.profiles
for each row execute function public.enforce_staff_limit_5();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.equipment enable row level security;
alter table public.haccp_logs enable row level security;
alter table public.incoming_logs enable row level security;
alter table public.personal_hygiene_logs enable row level security;
alter table public.facility_hygiene_logs enable row level security;

grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.equipment to authenticated;
grant select, insert, update, delete on public.haccp_logs to authenticated;
grant select, insert, update, delete on public.incoming_logs to authenticated;
grant select, insert, update, delete on public.personal_hygiene_logs to authenticated;
grant select, insert, update, delete on public.facility_hygiene_logs to authenticated;

drop policy if exists organizations_select_same_org on public.organizations;
create policy organizations_select_same_org
on public.organizations
for select
to authenticated
using (id = public.current_org_id());

drop policy if exists organizations_update_owner_only on public.organizations;
create policy organizations_update_owner_only
on public.organizations
for update
to authenticated
using (id = public.current_org_id() and public.current_user_role() = 'owner')
with check (id = public.current_org_id() and public.current_user_role() = 'owner');

drop policy if exists profiles_select_same_org on public.profiles;
create policy profiles_select_same_org
on public.profiles
for select
to authenticated
using (organization_id = public.current_org_id());

drop policy if exists profiles_insert_owner_only on public.profiles;
create policy profiles_insert_owner_only
on public.profiles
for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and public.current_user_role() = 'owner'
);

drop policy if exists profiles_update_owner_only on public.profiles;
create policy profiles_update_owner_only
on public.profiles
for update
to authenticated
using (
  organization_id = public.current_org_id()
  and public.current_user_role() = 'owner'
)
with check (
  organization_id = public.current_org_id()
  and public.current_user_role() = 'owner'
);

drop policy if exists equipment_select_same_org on public.equipment;
create policy equipment_select_same_org
on public.equipment
for select
to authenticated
using (organization_id = public.current_org_id());

drop policy if exists equipment_insert_manager_owner on public.equipment;
create policy equipment_insert_manager_owner
on public.equipment
for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and public.current_user_role() in ('owner', 'manager')
);

drop policy if exists equipment_update_manager_owner on public.equipment;
create policy equipment_update_manager_owner
on public.equipment
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

drop policy if exists equipment_delete_manager_owner on public.equipment;
create policy equipment_delete_manager_owner
on public.equipment
for delete
to authenticated
using (
  organization_id = public.current_org_id()
  and public.current_user_role() in ('owner', 'manager')
);

drop policy if exists haccp_logs_select_same_org on public.haccp_logs;
create policy haccp_logs_select_same_org
on public.haccp_logs
for select
to authenticated
using (organization_id = public.current_org_id());

drop policy if exists haccp_logs_insert_all_roles on public.haccp_logs;
create policy haccp_logs_insert_all_roles
on public.haccp_logs
for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and user_id = auth.uid()
  and public.current_user_role() in ('owner', 'manager', 'staff')
);

drop policy if exists haccp_logs_update_manager_owner on public.haccp_logs;
create policy haccp_logs_update_manager_owner
on public.haccp_logs
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

drop policy if exists haccp_logs_delete_owner_only on public.haccp_logs;
create policy haccp_logs_delete_owner_only
on public.haccp_logs
for delete
to authenticated
using (
  organization_id = public.current_org_id()
  and public.current_user_role() = 'owner'
);

drop policy if exists incoming_logs_select_same_org on public.incoming_logs;
create policy incoming_logs_select_same_org
on public.incoming_logs
for select
to authenticated
using (organization_id = public.current_org_id());

drop policy if exists incoming_logs_insert_all_roles on public.incoming_logs;
create policy incoming_logs_insert_all_roles
on public.incoming_logs
for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and user_id = auth.uid()
  and public.current_user_role() in ('owner', 'manager', 'staff')
);

drop policy if exists incoming_logs_update_manager_owner on public.incoming_logs;
create policy incoming_logs_update_manager_owner
on public.incoming_logs
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

drop policy if exists incoming_logs_delete_owner_only on public.incoming_logs;
create policy incoming_logs_delete_owner_only
on public.incoming_logs
for delete
to authenticated
using (
  organization_id = public.current_org_id()
  and public.current_user_role() = 'owner'
);

drop policy if exists personal_hygiene_logs_select_same_org on public.personal_hygiene_logs;
create policy personal_hygiene_logs_select_same_org
on public.personal_hygiene_logs
for select
to authenticated
using (organization_id = public.current_org_id());

drop policy if exists personal_hygiene_logs_insert_all_roles on public.personal_hygiene_logs;
create policy personal_hygiene_logs_insert_all_roles
on public.personal_hygiene_logs
for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and user_id = auth.uid()
  and public.current_user_role() in ('owner', 'manager', 'staff')
);

drop policy if exists personal_hygiene_logs_update_manager_owner on public.personal_hygiene_logs;
create policy personal_hygiene_logs_update_manager_owner
on public.personal_hygiene_logs
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

drop policy if exists personal_hygiene_logs_delete_owner_only on public.personal_hygiene_logs;
create policy personal_hygiene_logs_delete_owner_only
on public.personal_hygiene_logs
for delete
to authenticated
using (
  organization_id = public.current_org_id()
  and public.current_user_role() = 'owner'
);

drop policy if exists facility_hygiene_logs_select_same_org on public.facility_hygiene_logs;
create policy facility_hygiene_logs_select_same_org
on public.facility_hygiene_logs
for select
to authenticated
using (organization_id = public.current_org_id());

drop policy if exists facility_hygiene_logs_insert_all_roles on public.facility_hygiene_logs;
create policy facility_hygiene_logs_insert_all_roles
on public.facility_hygiene_logs
for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and user_id = auth.uid()
  and public.current_user_role() in ('owner', 'manager', 'staff')
);

drop policy if exists facility_hygiene_logs_update_manager_owner on public.facility_hygiene_logs;
create policy facility_hygiene_logs_update_manager_owner
on public.facility_hygiene_logs
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

drop policy if exists facility_hygiene_logs_delete_owner_only on public.facility_hygiene_logs;
create policy facility_hygiene_logs_delete_owner_only
on public.facility_hygiene_logs
for delete
to authenticated
using (
  organization_id = public.current_org_id()
  and public.current_user_role() = 'owner'
);
