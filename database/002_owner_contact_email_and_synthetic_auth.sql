alter table public.organizations
add column if not exists contact_email text null;

drop function if exists public.create_organization_with_owner(uuid, text, text, text);

create or replace function public.create_organization_with_owner(
  p_owner_user_id uuid,
  p_name text,
  p_org_code text,
  p_owner_username text,
  p_contact_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  insert into public.organizations (
    name,
    org_code,
    subscription_status,
    owner_id,
    contact_email
  )
  values (
    trim(p_name),
    lower(trim(p_org_code)),
    'trial',
    p_owner_user_id,
    nullif(lower(trim(p_contact_email)), '')
  )
  returning id into v_org_id;

  insert into public.profiles (id, organization_id, role, username, is_active)
  values (p_owner_user_id, v_org_id, 'owner', lower(trim(p_owner_username)), true);

  return v_org_id;
end;
$$;

revoke all on function public.create_organization_with_owner(uuid, text, text, text, text) from public;
grant execute on function public.create_organization_with_owner(uuid, text, text, text, text) to service_role;
