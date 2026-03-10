# Database Schema and RLS Guide

## 1) SQL Script
Use:
`database/001_multitenant_hassep.sql`

Run it in Supabase SQL Editor as a single script.

## 2) Tables
1. `organizations`
   - tenant entity
   - includes `org_code`, `subscription_status`, `owner_id`
2. `profiles`
   - user-to-organization mapping
   - includes role and active status
3. `equipment`
   - organization-scoped assets (fridge/freezer/room)
4. `haccp_logs`
   - temperature logs with out-of-range flag
5. `incoming_logs`
6. `personal_hygiene_logs`
7. `facility_hygiene_logs`

All business tables include `organization_id`.

## 3) Enums
1. `app_role`: `owner`, `manager`, `staff`
2. `subscription_status`: `active`, `trial`, `past_due`
3. `equipment_type`: `fridge`, `freezer`, `room`

## 4) Functional Helpers
1. `current_org_id()`:
   - resolves tenant for `auth.uid()`
2. `current_user_role()`:
   - resolves role for `auth.uid()`
3. `create_organization_with_owner(...)`:
   - DB-side transactional creation of organization + owner profile

Both are security-definer functions for reliable RLS evaluation.

## 5) Triggers
1. `set_haccp_log_org_and_severity`:
   - injects `organization_id` from equipment
   - computes `is_out_of_range` by min/max range
2. `enforce_staff_limit_5`:
   - blocks insert/update when active `staff` in tenant exceed 5
3. normalization triggers:
   - lowercases `org_code` and `username`
4. generic `updated_at` trigger for all mutable tables

## 6) RLS Policy Matrix
1. Read:
   - tenant-only (`organization_id = current_org_id()`)
2. Equipment write:
   - `owner` and `manager`
3. HACCP log insert:
   - `owner`, `manager`, `staff` (with `user_id = auth.uid()`)
4. HACCP log update:
   - `owner`, `manager`
5. HACCP log delete:
   - `owner` only
6. Profile writes:
   - owner-only in this version

## 7) Isolation Guarantee
The RLS design ensures cross-organization access is denied even if a request is crafted manually.

## 8) Suggested Validation SQL
1. Log in as user from Org A and verify no rows from Org B are visible.
2. Attempt staff update/delete on equipment and confirm policy denies.
3. Attempt creating 6th active staff and confirm trigger rejection.
