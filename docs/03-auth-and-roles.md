# Authentication and Role Model

## 1) Login Contract
Input fields:
1. `organizationCode`
2. `username`
3. `password`

Public registration contract (`/register`):
1. `restaurantName`
2. `organizationCode`
3. `ownerEmail`
4. `password`

## 2) Synthetic Email Mapping
Implemented in:
`utils/auth/synthetic-email.ts`

Formula:
`<normalized_username>__<normalized_org_code>@auth.hassep.local`

Normalization:
1. lowercase
2. trim
3. spaces -> `-`
4. remove unsupported characters

## 3) Login Flow
1. User submits org code + username + password.
2. Server action computes synthetic email.
3. Supabase `signInWithPassword(email, password)` is executed.
4. Server verifies:
   - profile exists
   - profile is active
   - profile organization matches submitted org code
5. On success -> redirect `/dashboard`.

## 4) Public SaaS Registration Flow
Implemented in:
`app/register/actions.ts`

Flow:
1. Validate restaurant name, slug, owner email, password.
2. Create auth user with owner email.
3. Execute DB helper function `create_organization_with_owner(...)`.
4. Auto sign-in owner.
5. Redirect to `/dashboard`.

Rollback logic:
1. if DB org/profile creation fails, created auth user is deleted.

## 5) Role Semantics
1. `owner`:
   - full operational control
   - can manage team in this version
2. `manager`:
   - can manage equipment
   - cannot manage team in this version
3. `staff`:
   - can create operational logs
   - cannot manage equipment or team

## 6) Team Provisioning (No Email Invite)
Implemented in:
`app/dashboard/settings/team/actions.ts`

Flow:
1. Owner creates `username + password`.
2. App derives synthetic email.
3. Service role creates Supabase auth user.
4. App inserts profile row in tenant with role `staff`.
5. If profile insert fails, auth user is rolled back.

## 7) Staff Limit Enforcement
Two layers:
1. App-layer pre-check (UX feedback)
2. DB trigger hard-limit (authoritative)

Limit:
`max 5 active staff users per organization`.

## 8) Deactivation Model
Current behavior:
1. `profiles.is_active = false`
2. inactive users are rejected by profile checks after login

## 9) Secrets and Safety
Required server secret:
`SUPABASE_SERVICE_ROLE_KEY`

This key must be server-only and never exposed to browser code.
