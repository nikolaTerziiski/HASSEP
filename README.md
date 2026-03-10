# HASSEP Multi-Tenant v1

Digital HACCP management system for restaurant operations, built with Next.js + Supabase.

## Stack
1. Next.js (App Router, Server Actions, Route Handlers)
2. TypeScript
3. Tailwind + shadcn/ui
4. Supabase Auth + PostgreSQL + RLS

## Quick Start
1. Install dependencies:
```bash
npm install
```
2. Copy env template:
```bash
cp .env.example .env.local
```
3. Fill all required env vars in `.env.local`.
4. Start development server:
```bash
npm run dev
```

## Database Setup
Run SQL script in Supabase SQL Editor:
`database/001_multitenant_hassep.sql`

Then perform owner bootstrap steps from:
`docs/05-operations-runbook.md`

## Main Routes
1. `/auth/login`
2. `/register`
3. `/dashboard`
4. `/dashboard/temperature`
5. `/dashboard/incoming`
6. `/dashboard/settings/equipment`
7. `/dashboard/settings/team`
8. `/api/qr/equipment-pdf`

## Quality Commands
```bash
npm run lint
npm run typecheck
npm run build
```

## Documentation
1. `docs/01-architecture.md`
2. `docs/02-database-and-rls.md`
3. `docs/03-auth-and-roles.md`
4. `docs/04-feature-functionalities.md`
5. `docs/05-operations-runbook.md`
6. `docs/06-testing-and-qa.md`
