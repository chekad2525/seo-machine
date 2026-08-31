# Google Search Console background sync

This delivery extends the v0.4.0 foundation and the first Search Data Pipeline slice. Package versions remain 0.4.0; it is an incremental delivery, not a production release.

## Enable on an API worker

1. Configure `DATABASE_URL`, `GSC_CLIENT_ID`, `GSC_CLIENT_SECRET`, and a stable `TOKEN_ENCRYPTION_KEY`.
2. Run `npm run db:generate`, `npm run build -w @seo-machine/db`, then `npm run db:migrate`.
3. Connect a Search Console property using Google's consent flow.
4. Set `GSC_SYNC_ENABLED=true` for a long-running API process and restart it. Leave it false for ordinary development and tests. A serverless process that sleeps between requests is not a supported scheduler host.

The worker scans every minute, handles up to ten due connections per scan sequentially, and starts a scan on boot. After success it schedules the next sync 24 hours later; failures retry after 15 minutes. It refreshes the rolling 28-day window using `dataState=final`. This is scheduled window refresh, not historical backfill. Shutdown stops new dispatches; an interrupted run becomes recoverable when its lease expires.

## Consistency and authorization

- Manual and scheduled runs share an atomic, ten-minute PostgreSQL lease per connection. Scheduled claims recheck the due date. Multiple API instances can safely compete for a connection.
- Data commits check lease ownership and expiry again. A worker whose lease was replaced cannot write results or clear the new worker's lease.
- A successful fetch replaces only that connection's requested window in one transaction using batches. Deleted or privacy-filtered rows from a previous fetch do not linger. Failure rolls back the replacement and preserves previously committed metrics.
- Access tokens refresh one minute before expiry, or once after HTTP 401. Optional rotated refresh tokens are encrypted; omission preserves the stored token. `invalid_grant` requires new consent. Temporary errors preserve credentials.
- Reconnecting clears prior credentials and invalidates outstanding sync ownership. Connection preparation responses omit encrypted credentials.
- API responses from Google have a 30-second timeout. A full 100,000-row safety cap fails explicitly and requests a smaller date range; no truncated result is marked complete.

Search Console itself may omit rows due to its internal limits and privacy filtering. An application-level successful sync means the returned window was stored atomically, not that every underlying search was exported. See [Search Analytics query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query) and [Google OAuth offline access](https://developers.google.com/identity/protocols/oauth2/web-server#offline).

## Verification and deployment limits

`npm test` includes token lifecycle and scheduler tests using mocked Google responses. Set `RUN_DATABASE_TESTS=true` only against a dedicated test PostgreSQL database to also run real lease-contention, idempotency, and rollback tests. These tests create and remove their own tenant. CI enables them after applying migrations.

Live Google consent and refresh still require configured credentials and an accessible property. Local Docker was unavailable during this delivery, so PostgreSQL integration results must be checked in CI or run locally before deployment.

The API now verifies signed internal requests with database replay protection. Plain `x-user-id` headers are rejected. Keep network isolation and TLS in deployment, and follow [internal authentication setup and remaining security risks](internal-api-auth.md). Production readiness still requires dependency updates and live Google/phone validation.

Still pending: chart aggregation, large-property daily backfill, quota-aware retry/backoff, per-connection schedule controls, and a full production security review.
