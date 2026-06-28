# APFlow

APFlow is an invoice intake and approval automation MVP for small business finance teams.

## What Is Implemented

- Next.js app with TypeScript and server-rendered workflow screens.
- Prisma and SQLite persistence with seeded users, departments, vendors, invoices, line items, approvals, audit logs, and export batches.
- Role/persona switching for finance and approver demo flows.
- Invoice upload route with local file storage and deterministic mock AI extraction.
- Human review form with field corrections, line items, duplicate warnings, routing, and audit logging.
- Approval queue with approve, reject, and request-changes decisions.
- Dashboard metrics for review load, pending approvals, approved export value, overdue invoices, bottlenecks, and recent activity.
- CSV export route for approved invoices that records export batches and marks invoices exported.

## Run Locally

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

The app defaults to SQLite at `prisma/dev.db`. Runtime uploads are stored under `uploads/`; both are ignored by Git.

## Verification

```bash
npm run typecheck
npm run build
npm audit
```
