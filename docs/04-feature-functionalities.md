# Feature Functionality Documentation

## 1) Dashboard Overview (`/dashboard`)
Purpose:
1. show current operational status per equipment
2. surface critical temperature deviations quickly

Behavior:
1. loads active equipment for current organization
2. loads recent HACCP logs
3. computes latest log per equipment
4. displays:
   - normal/critical state
   - last measured temperature
   - timestamp

Critical summary:
1. top recent out-of-range logs are shown at page top.

## 2) Equipment Manager (`/dashboard/settings/equipment`)
Capabilities:
1. list equipment
2. add equipment
3. edit equipment
4. delete equipment

Fields:
1. `name`
2. `type` (`fridge`, `freezer`, `room`)
3. `minTemp`
4. `maxTemp`
5. `isActive`

Role access:
1. owner and manager can mutate
2. staff is read-only

Impact:
1. new/updated equipment appears immediately in temperature form dropdown.

## 3) Team Management (`/dashboard/settings/team`)
Capabilities:
1. create staff user with username/password
2. deactivate staff user
3. view tenant users and statuses

Constraints:
1. owner-only in this implementation
2. max 5 active staff users

## 4) Temperature Logging (`/dashboard/temperature`)
Source data:
1. active equipment from database (tenant-scoped)

Validation:
1. temperature range: `-30` to `100`
2. if equipment type is `fridge` and temperature `> 5`, corrective action is mandatory

Submit flow:
1. client validates form
2. server action re-validates and checks equipment ownership
3. insert into `haccp_logs`
4. trigger computes out-of-range flag
5. dashboard overview is revalidated

Prefill:
1. supports query param:
`/dashboard/temperature?equipment_id=<uuid>`

Security:
1. prefill is ignored if equipment is outside tenant scope.

## 5) QR PDF Generation (`/api/qr/equipment-pdf`)
Purpose:
1. print one QR label per equipment item
2. simplify staff logging flow on mobile

Output:
1. downloadable PDF
2. each page contains:
   - organization name
   - equipment name/type
   - QR linking to prefilled temperature URL

Access:
1. owner and manager only.

## 6) Existing Placeholder Pages
The following pages remain placeholders in this release:
1. personal hygiene detailed workflow
2. facility hygiene detailed workflow

They stay inside the tenant-protected dashboard shell.

## 7) Incoming Control (Human-in-the-Loop OCR) (`/dashboard/incoming`)
### Step A: Analyze
1. Upload invoice image.
2. Server action uploads file to Supabase Storage.
3. Image is sent to AI provider (OpenAI or Gemini).
4. AI response is normalized to JSON.

### Step B: Verify
1. Extracted JSON is loaded into editable form.
2. `useFieldArray` renders table rows for line items.
3. Operator corrects supplier/document/items manually.

### Step C: Save
1. User clicks `Потвърди и Запиши`.
2. Server action validates payload and tenant file path.
3. Data is saved into `incoming_logs`.

Notes:
1. No automatic save is performed after AI analysis.
2. Storage path is tenant-scoped (`org-<organization_id>/...`).
