-- Migration 005: Facility hygiene templates and daily confirmations
-- Run in Supabase SQL Editor after the previous migrations.

create table if not exists public.cleaning_products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint cleaning_products_unique_name unique (organization_id, name)
);

create table if not exists public.facility_hygiene_areas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint facility_hygiene_areas_unique_name unique (organization_id, name)
);

create table if not exists public.facility_hygiene_area_products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  area_id uuid not null references public.facility_hygiene_areas(id) on delete cascade,
  cleaning_product_id uuid not null references public.cleaning_products(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint facility_hygiene_area_products_unique_mapping
    unique (organization_id, area_id, cleaning_product_id)
);

drop trigger if exists trg_cleaning_products_updated_at on public.cleaning_products;
create trigger trg_cleaning_products_updated_at
before update on public.cleaning_products
for each row execute function public.set_updated_at();

drop trigger if exists trg_facility_hygiene_areas_updated_at on public.facility_hygiene_areas;
create trigger trg_facility_hygiene_areas_updated_at
before update on public.facility_hygiene_areas
for each row execute function public.set_updated_at();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'facility_hygiene_logs'
      and column_name = 'area'
  ) then
    execute $sql$
      insert into public.facility_hygiene_areas (organization_id, name, created_at, updated_at)
      select distinct
        l.organization_id,
        trim(l.area),
        min(l.created_at),
        max(coalesce(l.updated_at, l.created_at))
      from public.facility_hygiene_logs l
      where l.area is not null
        and trim(l.area) <> ''
      group by l.organization_id, trim(l.area)
      on conflict (organization_id, name) do nothing
    $sql$;
  end if;
end
$$;

drop policy if exists facility_hygiene_logs_select_same_org on public.facility_hygiene_logs;
drop policy if exists facility_hygiene_logs_insert_all_roles on public.facility_hygiene_logs;
drop policy if exists facility_hygiene_logs_update_manager_owner on public.facility_hygiene_logs;
drop policy if exists facility_hygiene_logs_delete_owner_only on public.facility_hygiene_logs;

alter table public.facility_hygiene_logs
  add column if not exists area_id uuid references public.facility_hygiene_areas(id) on delete restrict,
  add column if not exists performed_by_user_id uuid references auth.users(id) on delete restrict,
  add column if not exists used_products_snapshot jsonb not null default '[]'::jsonb;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'facility_hygiene_logs'
      and column_name = 'area'
  ) then
    execute $sql$
      update public.facility_hygiene_logs l
      set area_id = a.id
      from public.facility_hygiene_areas a
      where l.area_id is null
        and a.organization_id = l.organization_id
        and a.name = trim(l.area)
    $sql$;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'facility_hygiene_logs'
      and column_name = 'user_id'
  ) then
    execute $sql$
      update public.facility_hygiene_logs
      set performed_by_user_id = user_id
      where performed_by_user_id is null
    $sql$;
  end if;
end
$$;

alter table public.facility_hygiene_logs
  drop constraint if exists facility_hygiene_logs_status_check,
  drop constraint if exists facility_hygiene_logs_status_valid_v2;

do $$
declare
  status_constraint record;
begin
  for status_constraint in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.facility_hygiene_logs'::regclass
      and c.contype = 'c'
      and (
        c.conname ilike '%status%'
        or pg_get_constraintdef(c.oid) ilike '%status%'
      )
  loop
    execute format(
      'alter table public.facility_hygiene_logs drop constraint if exists %I',
      status_constraint.conname
    );
  end loop;
end
$$;

update public.facility_hygiene_logs
set status = case
  when status = 'passed' or status is null then 'completed'
  else 'issue_found'
end;

alter table public.facility_hygiene_logs
  alter column status set default 'completed';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'facility_hygiene_logs_status_valid_v2'
  ) then
    alter table public.facility_hygiene_logs
      add constraint facility_hygiene_logs_status_valid_v2
      check (status in ('completed', 'issue_found'));
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'facility_hygiene_logs_unique_area_day'
  ) then
    alter table public.facility_hygiene_logs
      drop constraint facility_hygiene_logs_unique_area_day;
  end if;
end
$$;

do $$
begin
  insert into public.facility_hygiene_areas (organization_id, name)
  select distinct organization_id, 'Неуточнена зона'
  from public.facility_hygiene_logs
  where area_id is null
  on conflict (organization_id, name) do nothing;

  update public.facility_hygiene_logs l
  set area_id = a.id
  from public.facility_hygiene_areas a
  where l.area_id is null
    and a.organization_id = l.organization_id
    and a.name = 'Неуточнена зона';
end
$$;

alter table public.facility_hygiene_logs
  alter column area_id set not null,
  alter column performed_by_user_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'facility_hygiene_logs_unique_area_template_day'
  ) then
    alter table public.facility_hygiene_logs
      add constraint facility_hygiene_logs_unique_area_template_day
      unique (organization_id, check_date, area_id);
  end if;
end
$$;

alter table public.facility_hygiene_logs
  drop column if exists area,
  drop column if exists user_id;

create index if not exists idx_cleaning_products_org_name
  on public.cleaning_products(organization_id, name);

create index if not exists idx_facility_hygiene_areas_org_name
  on public.facility_hygiene_areas(organization_id, name);

create index if not exists idx_facility_hygiene_area_products_org_area
  on public.facility_hygiene_area_products(organization_id, area_id);

create index if not exists idx_facility_hygiene_logs_area_date
  on public.facility_hygiene_logs(organization_id, area_id, check_date desc);

alter table public.cleaning_products enable row level security;
alter table public.facility_hygiene_areas enable row level security;
alter table public.facility_hygiene_area_products enable row level security;

grant select, insert, update, delete on public.cleaning_products to authenticated;
grant select, insert, update, delete on public.facility_hygiene_areas to authenticated;
grant select, insert, update, delete on public.facility_hygiene_area_products to authenticated;

drop policy if exists cleaning_products_select_same_org on public.cleaning_products;
create policy cleaning_products_select_same_org
on public.cleaning_products
for select
to authenticated
using (organization_id = public.current_org_id());

drop policy if exists cleaning_products_manage_manager_owner on public.cleaning_products;
create policy cleaning_products_manage_manager_owner
on public.cleaning_products
for all
to authenticated
using (
  organization_id = public.current_org_id()
  and public.current_user_role() in ('owner', 'manager')
)
with check (
  organization_id = public.current_org_id()
  and public.current_user_role() in ('owner', 'manager')
);

drop policy if exists facility_hygiene_areas_select_same_org on public.facility_hygiene_areas;
create policy facility_hygiene_areas_select_same_org
on public.facility_hygiene_areas
for select
to authenticated
using (organization_id = public.current_org_id());

drop policy if exists facility_hygiene_areas_manage_manager_owner on public.facility_hygiene_areas;
create policy facility_hygiene_areas_manage_manager_owner
on public.facility_hygiene_areas
for all
to authenticated
using (
  organization_id = public.current_org_id()
  and public.current_user_role() in ('owner', 'manager')
)
with check (
  organization_id = public.current_org_id()
  and public.current_user_role() in ('owner', 'manager')
);

drop policy if exists facility_hygiene_area_products_select_same_org on public.facility_hygiene_area_products;
create policy facility_hygiene_area_products_select_same_org
on public.facility_hygiene_area_products
for select
to authenticated
using (organization_id = public.current_org_id());

drop policy if exists facility_hygiene_area_products_manage_manager_owner on public.facility_hygiene_area_products;
create policy facility_hygiene_area_products_manage_manager_owner
on public.facility_hygiene_area_products
for all
to authenticated
using (
  organization_id = public.current_org_id()
  and public.current_user_role() in ('owner', 'manager')
)
with check (
  organization_id = public.current_org_id()
  and public.current_user_role() in ('owner', 'manager')
);

create policy facility_hygiene_logs_select_same_org
on public.facility_hygiene_logs
for select
to authenticated
using (organization_id = public.current_org_id());

create policy facility_hygiene_logs_insert_all_roles
on public.facility_hygiene_logs
for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and performed_by_user_id = auth.uid()
  and public.current_user_role() in ('owner', 'manager', 'staff')
);

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

create policy facility_hygiene_logs_delete_owner_only
on public.facility_hygiene_logs
for delete
to authenticated
using (
  organization_id = public.current_org_id()
  and public.current_user_role() = 'owner'
);
