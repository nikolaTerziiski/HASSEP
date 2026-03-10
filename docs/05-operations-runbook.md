# Operations Runbook

## 1) Prerequisites
Required env vars:
1. `NEXT_PUBLIC_SUPABASE_URL`
2. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or anon key fallback)
3. `SUPABASE_SERVICE_ROLE_KEY`
4. `DATABASE_URL` (optional for external tools)
5. `SUPABASE_INCOMING_BUCKET` (optional, default: `incoming-invoices`)
6. `OPENAI_API_KEY` or `GEMINI_API_KEY` for incoming OCR analysis

## 2) Database Provisioning
1. Open Supabase SQL Editor.
2. Run:
`database/001_multitenant_hassep.sql`

## 3) Owner Onboarding
Primary flow:
1. Open `/register`
2. Enter restaurant name, slug, owner email, password
3. System creates owner + organization and signs in automatically

Manual bootstrap is optional fallback.

### Manual Step A: Create organization

Example SQL:
```sql
insert into public.organizations (name, org_code, subscription_status)
values ('My Restaurant', 'my-restaurant', 'active')
returning id;
```

### Manual Step B: Create owner auth user
1. Choose owner username, e.g. `owner1`
2. Build synthetic email:
`owner1__my-restaurant@auth.hassep.local`
3. In Supabase Auth dashboard, create user with that email and password.

### Manual Step C: Link profile
```sql
insert into public.profiles (id, organization_id, role, username, is_active)
values ('<auth_user_uuid>', '<organization_uuid>', 'owner', 'owner1', true);
```

### Manual Step D: Set organization owner
```sql
update public.organizations
set owner_id = '<auth_user_uuid>'
where id = '<organization_uuid>';
```

## 4) Local Run
1. `npm install`
2. configure `.env.local`
3. `npm run dev`

## 5) Production Run
1. `npm run build`
2. `npm run start`

## 6) Docker Run
1. `docker build -t hassep-mvp .`
2. `docker run -p 3000:3000 --env-file .env.local hassep-mvp`

## 7) Common Operational Tasks
1. Rotate service role key:
   - rotate in Supabase
   - update deployment secret
   - redeploy app
2. Disable compromised user:
   - set `profiles.is_active = false`
3. Add manager manually:
   - create auth user (synthetic email)
   - insert profile with role `manager`
4. Configure incoming OCR:
   - set `OPENAI_API_KEY` or `GEMINI_API_KEY`
   - verify bucket exists (or let app auto-create on first upload)

## 8) Known Scope Limits (Current Release)
1. No Stripe billing enforcement.
2. No email alert dispatching.
3. Team UI supports staff provisioning only.
