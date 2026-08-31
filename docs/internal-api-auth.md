# Internal API authentication delivery

## What changed

The API no longer treats `x-user-id` as authentication. All routes are protected by a global guard unless explicitly marked public. Only health and the Google Search Console OAuth callback are public; the latter still validates its one-time OAuth state. Adding a new controller does not silently create a public endpoint.

The server-only Next.js helper signs a versioned HMAC-SHA256 envelope covering timestamp, random nonce, permission scope, canonical user ID, HTTP method, exact path/query, and SHA256 of the exact body bytes. Nest verifies raw JSON bytes with constant-time signature comparison and a 30-second clock window. A unique PostgreSQL nonce insert rejects concurrent replay across API instances. Expired nonces are removed on authenticated traffic. Database failure denies access rather than bypassing replay protection.

User scope comes only from a server-side Auth.js session and requires an existing user. Identity scope supports trusted server calls to Google identity sync and phone OTP endpoints; it cannot access tenant APIs. Browser callers cannot choose this scope or provide signing headers. Google sync remains a trusted server assertion endpoint: there is no generic browser proxy for arbitrary Google profiles.

Browser JSON mutations check the exact configured origin and content type. Phone forms use Next.js Server Actions and Auth.js CSRF handling. The internal helper refuses redirects so credentials are not forwarded to another destination. Retrying a request requires a new signature/nonce; this is replay prevention, not business-operation idempotency.

## Configuration and compatibility

- Generate a separate random `INTERNAL_API_SECRET` of at least 32 bytes and configure the same value in web and API. Never put it in a `NEXT_PUBLIC_*` variable. Missing or placeholder values fail API startup. For example, `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` generates a value locally; do not commit the output.
- Set `APP_ORIGIN` to the web application's exact public origin. Production JSON mutations fail closed when it is absent. Forward the normal Origin header through the reverse proxy.
- Use `API_INTERNAL_URL=http://localhost:3001` for local processes; Compose uses `http://api:3001`. Use HTTPS between hosts or a trusted isolated local network. Signatures provide integrity/authentication, not encryption.
- Apply migrations before starting the API. `InternalApiNonce` is required. Keep host clocks synchronized within 30 seconds. Rotate the shared key by coordinating web/API restarts; there is no dual-key rotation window yet.
- Compose publishes the API and PostgreSQL only on loopback. Configure an explicit public reverse-proxy route for the GSC callback when needed. Keep tenant/identity API routes private even with request signing.
- Sessions now use Auth.js encrypted JWT cookies (24-hour maximum), because Credentials requires JWT sessions. Existing database-session cookies require a fresh sign-in. Prisma continues to persist canonical users and provider accounts. JWT sessions do not yet have a session-revocation list; deleted users are rejected at the API boundary.
- Google login requires an explicitly verified email and matching provider subject. No truthy-email fallback enables verification, and dangerous automatic email account linking remains disabled.
- OTP issuance and verification serialize per phone in PostgreSQL. Concurrent requests send one code per minute; attempts commit even when verification fails, and a correct code can be consumed once. Sending occurs outside the database transaction. Production refuses `SMS_DEV_MODE=true` and weak/missing OTP hash secrets.

For local setup, copy `.env.example`, replace secret placeholders, start PostgreSQL, export the variables into both processes (Prisma may also need a local `.env` beside its schema), run `npm install`, `npm run db:generate`, `npm run build -w @seo-machine/db`, and `npm run db:migrate`, then start `npm run dev`. The root development command does not automatically load a root `.env` into Nest.

## Validation and remaining risks

HTTP tests exercise the actual Nest raw-body parser and guards: bare-header rejection, signature/body/query/method/subject tampering, stale/future timestamps, permission scopes, deleted users, and concurrent replay. CI runs the same suite with real PostgreSQL and additionally tests OTP issuance/consumption races and failed-attempt limits. Local HTTP tests use an in-memory nonce double when `RUN_DATABASE_TESTS` is unset.

This delivery is not approval for public deployment. On 2026-08-31, `npm audit --omit=dev` reported **10 vulnerable production packages (4 high, 6 moderate)** in the inherited dependency tree, including Next.js, NestJS/Express dependencies, Multer, and PostCSS. The report includes major-version remediation suggestions; this delivery does not silently upgrade the framework architecture. A reviewed framework/dependency upgrade and a fresh audit are required before production. No `npm audit fix --force` was run.

Additional release prerequisites: end-to-end live Google and SMS tests, trusted-proxy configuration, a distributed per-IP/global SMS abuse budget beyond the per-phone limit, session revocation policy, OAuth reconnection race review, and secure secrets/TLS/backup operations. A valid internal signature identifies the web server's assertion; it does not protect against compromise of that server or its signing key.

References: [Nest raw-body verification](https://docs.nestjs.com/faq/raw-body), [Auth.js Credentials](https://authjs.dev/getting-started/authentication/credentials), and [Auth.js UnsupportedStrategy](https://authjs.dev/reference/core/errors#unsupportedstrategy).
