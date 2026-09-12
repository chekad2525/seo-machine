# SEO Machine v0.4.0 + Scheduled Pipeline and API Authentication

SEO Machine is a NestJS + Next.js + PostgreSQL + Prisma monorepo for turning search data into a focused operating rhythm.

## What v0.4.0 adds

- Canonical SEO Machine users shared by Google OAuth and verified phone OTP.
- Hardened identity linking: Google provider account IDs are authoritative; email is a secondary link only when Google vouches for it.
- Atomic onboarding that creates an Organization, owner Membership, Workspace, Project, and optional pending Search Console connection in one transaction.
- Tenant-scoped organization, workspace, project, and Search Console preparation APIs.
- Auth.js Google provider and phone OTP credential entry point.
- Read-only Google Search Console scope preparation: `webmasters.readonly`.
- Search Console query/page ingestion for a bounded, idempotent daily metric window.
- Optional scheduled sync, automatic Google token refresh, and database lease protection.
- Signed internal requests, database replay protection, and atomic phone OTP verification.
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

The root commands `npm run dev`, `npm test`, and `npm run typecheck` automatically generate Prisma Client and build the shared database package before starting. Run `npm run db:prepare` to perform just this preparation; it does not apply migrations or connect to the database. Database integration tests require a migrated PostgreSQL database and `RUN_DATABASE_TESTS=true`.

For local phone OTP tests, set `SMS_DEV_MODE=true`; the NestJS API response includes a `devCode`. In production, set `SMS_DEV_MODE=false`, `KAVENEGAR_API_KEY`, and `KAVENEGAR_VERIFY_TEMPLATE` to use the Kavenegar VerifyLookup adapter. Requests are rate-limited to one code per minute and failed delivery invalidates the stored OTP.

## API surface

All non-public API routes require a short-lived request signature from the Next.js server. A plain `x-user-id` is rejected. User requests are bound to the Auth.js session; identity requests use a separate signed scope. Configure the same random `INTERNAL_API_SECRET` in API and web, and `APP_ORIGIN` in web. See [API authentication and deployment](docs/internal-api-auth.md).

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
| POST | `/api/v1/integrations/google-search-console/sync` | Fetch and upsert query/page metrics |
| GET | `/api/v1/integrations/google-search-console/metrics` | Read stored query or page metrics |
| GET | `/api/v1/integrations/google-search-console/summary` | Read weighted KPIs, daily trend, and period comparison |
| GET | `/api/v1/integrations/google-search-console/sync/latest` | Read the latest sync run |
| GET/POST | `/api/v1/integrations/google-search-console/keyword-tracking` | Import, manage, and report stored keyword ranks |

## Google Search Console next step

v0.4.0 prepares and completes the read-only OAuth flow with state + PKCE, verifies the selected property, and encrypts access/refresh tokens with AES-256-GCM before persisting them. Set `GSC_CLIENT_ID`, `GSC_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`, and `GSC_REDIRECT_URI` in production.

The Search Data Pipeline requests a rolling 28-day window ending two days before today with `dataState=final`. This delay is a conservative default, not a guarantee of complete Google coverage. A requested range may be between 1 and 31 days. Sync runs are recorded as `RUNNING`, `COMPLETED`, or `FAILED`. Atomic window replacement keeps retries idempotent and removes stale rows. The API fetches up to 25,000 rows per page and stores query and page dimensions separately.

Set `GSC_SYNC_ENABLED=true` on a long-running API worker to enable scheduled sync. Access tokens refresh automatically; revoked authorization requires reconnection. See [scheduling, testing, and deployment constraints](docs/gsc-scheduling.md). Public deployment remains blocked by dependency advisories and outstanding production validation documented in [API authentication](docs/internal-api-auth.md).

The keyword tracker accepts `.xlsx` files with a `keyword` column and an optional `target_url` column (or treats the first column as keywords when there is no header). Configure `SERPER_API_KEY`, or the DataForSEO credentials, for live Google rank checks. Set `SERP_SYNC_ENABLED=true` on a long-running API worker to enqueue one rank check per keyword per UTC day; stored snapshots power the rank history and movement report.
