# SEO Machine v0.4.0

SEO Machine is a NestJS + Next.js + PostgreSQL + Prisma monorepo for turning search data into a focused operating rhythm.

## What v0.4.0 adds

- Canonical SEO Machine users shared by Google OAuth and verified phone OTP.
- Hardened identity linking: Google provider account IDs are authoritative; email is a secondary link only when Google vouches for it.
- Atomic onboarding that creates an Organization, owner Membership, Workspace, Project, and optional pending Search Console connection in one transaction.
- Tenant-scoped organization, workspace, project, and Search Console preparation APIs.
- Auth.js Google provider and phone OTP credential entry point.
- Read-only Google Search Console scope preparation: `webmasters.readonly`.
- Postgres migration, Docker Compose, tests, and GitHub Actions CI.

## Run locally

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`. The API health check is at `http://localhost:3001/api/v1/health`.

For local phone OTP tests, set `SMS_DEV_MODE=true`; the NestJS API response includes a `devCode`. In production, replace that branch with the Kavenegar VerifyLookup adapter without changing the Auth.js provider contract.

## API surface

All authenticated API routes expect the internal `x-user-id` boundary header. Only the server-side Next.js proxy should set it in production.

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/v1/identity/google/sync` | Canonical Google identity sync |
| POST | `/api/v1/identity/phone/request` | Issue a hashed, expiring OTP |
| POST | `/api/v1/identity/phone/verify` | Consume OTP and upsert verified phone user |
| GET | `/api/v1/onboarding` | Read setup state |
| POST | `/api/v1/onboarding/complete` | Atomically create initial tenant graph |
| GET/POST | `/api/v1/organizations` | List or create organizations |
| GET/POST | `/api/v1/workspaces` | List or create workspaces |
| GET/POST | `/api/v1/projects` | List or create projects |
| GET/POST | `/api/v1/integrations/google-search-console/status\|prepare` | Read or prepare GSC connection |

## Google Search Console next step

v0.4.0 prepares and completes the read-only OAuth flow with state + PKCE, verifies the selected property, and encrypts access/refresh tokens with AES-256-GCM before persisting them. Set `GSC_CLIENT_ID`, `GSC_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`, and `GSC_REDIRECT_URI` in production.
