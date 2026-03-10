# HACCP Multi-Tenant Architecture (v1)

## 1) Goal
This release transforms the MVP into a strict multi-tenant platform where each restaurant (organization) is isolated by design at both application and database levels.

## 2) Core Building Blocks
1. **Frontend/UI**: Next.js App Router + Tailwind + shadcn/ui.
2. **Auth & Data**: Supabase Auth + PostgreSQL (RLS-enabled).
3. **Server Execution**: Next.js Server Components, Route Handlers, and Server Actions.
4. **Tenant Isolation**: `organization_id` on business tables and RLS policies.

## 3) Tenant Model
1. `organizations` is the tenant boundary.
2. `profiles` links every authenticated user to a single organization.
3. `equipment` and all HACCP logs are organization-scoped.
4. All reads/writes are limited to rows where `organization_id == current user's organization_id`.

## 4) Login Model
Login uses:
1. `organization_code`
2. `username`
3. `password`

Because Supabase Auth requires email/password, the app computes a deterministic synthetic email:
`<normalized_username>__<normalized_org_code>@auth.hassep.local`

This keeps UX simple while staying compatible with Supabase Auth.

Public onboarding is available at `/register`, where owner provides:
1. restaurant name
2. desired organization code (slug)
3. owner email
4. password

The server action then:
1. creates Auth user by email
2. creates organization + owner profile
3. signs in owner and redirects to dashboard

## 5) Authorization Layers
1. **App Layer**: role checks in server actions (`owner`, `manager`, `staff`).
2. **DB Layer**: RLS policies enforce row-level tenant boundaries and role constraints.

If app checks are bypassed, RLS still protects data.

## 6) Key Runtime Paths
1. `proxy.ts`:
   - blocks unauthenticated access to `/dashboard/*`
   - redirects authenticated users away from `/auth/login`
2. `app/auth/login/actions.ts`:
   - signs in with synthetic email
   - verifies active profile + organization match
3. `app/register/actions.ts`:
   - public owner sign-up flow
   - creates organization and owner profile
4. `utils/auth/tenant.ts`:
   - current profile loading
   - role/tenant guards for pages/actions

## 7) Main Modules
1. `/dashboard` overview:
   - dynamic equipment cards
   - critical alert summary
2. `/dashboard/settings/equipment`:
   - equipment CRUD
3. `/dashboard/settings/team`:
   - staff creation/deactivation (owner-controlled)
4. `/dashboard/temperature`:
   - DB-driven temperature logging with rule-based validation
5. `/api/qr/equipment-pdf`:
   - printable QR PDF for quick equipment selection
6. `/dashboard/incoming`:
   - AI analyze + human verification + save flow

## 8) Security Notes
1. `SUPABASE_SERVICE_ROLE_KEY` is required for admin operations (staff auth user creation).
2. Service role usage is restricted to server-side code (`utils/supabase/admin.ts`).
3. Client bundles never receive service role secrets.
