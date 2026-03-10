# Testing and QA Checklist

## 1) Authentication
1. Public registration succeeds and creates owner organization.
2. Registration fails for duplicate organization code.
1. Login fails with wrong organization code.
2. Login fails with wrong username/password.
3. Login succeeds with valid org + username + password.
4. Inactive profile cannot access dashboard.

## 2) Tenant Isolation
1. User from Org A cannot view Org B equipment.
2. User from Org A cannot view Org B logs.
3. `equipment_id` query from another org is ignored/rejected.

## 3) Role Authorization
1. Staff cannot create/edit/delete equipment.
2. Manager can create/update/delete equipment.
3. Owner can create/update/delete equipment.
4. Staff can insert temperature logs.
5. Staff cannot delete logs.
6. Owner can delete logs (DB policy level).

## 4) Team Management
1. Owner can create staff user.
2. 6th active staff creation fails.
3. Duplicate username inside organization fails.
4. Deactivation sets `is_active = false` and blocks dashboard access.

## 5) Temperature Workflow
1. Equipment list is loaded from DB.
2. Fridge over 5°C requires corrective action.
3. Valid entries are saved in `haccp_logs`.
4. Trigger sets `is_out_of_range` correctly.
5. Overview updates after new log insert.

## 6) Overview and Alerts
1. One status card per active equipment.
2. Latest reading is displayed per equipment.
3. Critical logs are summarized at top.

## 7) QR PDF
1. Endpoint returns downloadable PDF.
2. PDF contains one QR page per active equipment.
3. QR opens temperature page with preselected equipment.
4. Non-owner/manager requests are rejected.

## 8) Regression Checks
1. Build: `npm run build`
2. Typecheck: `npm run typecheck`
3. Lint: `npm run lint`
4. Smoke navigation:
   - `/register`
   - `/auth/login`
   - `/dashboard`
   - `/dashboard/settings/equipment`
   - `/dashboard/settings/team`
   - `/dashboard/temperature`
