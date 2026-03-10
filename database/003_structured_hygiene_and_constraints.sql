-- Migration 003: Structured hygiene checklist + unique daily constraints
-- Run in Supabase SQL Editor.

-- ── personal_hygiene_logs ───────────────────────────────────────────────────
-- Add structured checklist result (keyed by item label → boolean)
alter table public.personal_hygiene_logs
  add column if not exists checklist_result jsonb not null default '{}'::jsonb,
  add column if not exists all_passed boolean not null default true,
  add column if not exists performed_at timestamptz not null default now();

-- One record per user per day (prevent duplicates at DB level)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'personal_hygiene_logs_unique_user_day'
  ) then
    alter table public.personal_hygiene_logs
      add constraint personal_hygiene_logs_unique_user_day
      unique (organization_id, user_id, check_date);
  end if;
end
$$;

-- ── facility_hygiene_logs ───────────────────────────────────────────────────
-- Add status, corrective action, and performed_at timestamp
alter table public.facility_hygiene_logs
  add column if not exists status text not null default 'passed'
    check (status in ('passed', 'failed', 'needs_attention')),
  add column if not exists performed_at timestamptz not null default now(),
  add column if not exists corrective_action text null;

-- One record per area per day (prevent duplicates at DB level)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'facility_hygiene_logs_unique_area_day'
  ) then
    alter table public.facility_hygiene_logs
      add constraint facility_hygiene_logs_unique_area_day
      unique (organization_id, check_date, area);
  end if;
end
$$;

-- ── indexes for new columns ─────────────────────────────────────────────────
create index if not exists idx_personal_hygiene_logs_check_date
  on public.personal_hygiene_logs(organization_id, check_date);

create index if not exists idx_facility_hygiene_logs_check_date
  on public.facility_hygiene_logs(organization_id, check_date);
