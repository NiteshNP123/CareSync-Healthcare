# CareSync

CareSync is an independent healthcare coordination prototype that keeps a patient's care journey connected across providers, reports, medications, appointments, and consent.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/caresync/src/App.tsx` — public landing page and patient care-space routes
- `artifacts/caresync/src/index.css` — CareSync visual tokens and responsive styling
- `artifacts/api-server/src/routes/caresync.ts` — shared demo API state and connected workflows
- `lib/api-spec/openapi.yaml` — source of truth for generated API hooks and schemas

## Architecture decisions

- The first build uses a small in-memory demo state so the end-to-end prototype works without storing real health data.
- Consent decisions and appointment bookings mutate the shared API state and invalidate affected client queries.
- All identity verification, OTP, AI, and payment behavior is explicitly demo/prototype functionality.

## Product

The app introduces CareSync publicly, then provides a patient care space with an overview, journey timeline, verified doctor discovery, appointment booking, consent management, pharmacy order tracking, AI-assisted context, and profile/privacy controls.

## User preferences

The product must remain clearly independent from Government of India, ABDM, ABHA, eSanjeevani, Aadhaar, and other government services unless an authorized integration is actually added.

## Gotchas

After changing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` before using generated hooks or schemas.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
