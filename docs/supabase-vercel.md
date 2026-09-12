# Supabase + Vercel deployment

Runtime DATABASE_URL for BOTH API and web (replace the placeholder locally with
the percent-encoded database password; never commit the real value):

```text
postgresql://postgres.jnhznigomicsrtrbjkvq:[ENCODED_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
```

Prisma 5.22 uses transaction pooling for runtime and session pooling for migrations.
The schema intentionally keeps only DATABASE_URL so local development and CI do not
need a new mandatory secret. The migration helper overrides it only in its process.

From the repository root in PowerShell, check migration status first:

```powershell
./scripts/migrate-supabase.ps1
```

After reviewing the target and migration SQL, apply pending migrations:

```powershell
./scripts/migrate-supabase.ps1 -Apply
```

Password input is hidden, URI-encoded automatically, not saved to disk or passed as
a command argument. The previous environment value is restored. Neither command
runs reset, seed, or migrate dev. Existing local data is NOT copied. On an existing
production database, take a backup before applying migrations. Do not run migrations
as part of a Vercel build or on a transaction-pooler connection.

Security prerequisite: disable the Supabase Data API in API settings if this project
uses only Prisma. Existing application migrations do not establish Supabase RLS
policies. Do not expose public-schema authentication/token tables through Data API.
If Data API is needed later, design grants and RLS policies before enabling it.

Vercel web: Next.js preset, apps/web root, include source outside root, npm run build.
Commit apps/web/package.json with its prebuild first. The API already has prebuild.
Required web variables: DATABASE_URL, AUTH_SECRET, AUTH_TRUST_HOST=true,
AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, INTERNAL_API_SECRET (same as API),
API_INTERNAL_URL=https://seo-machine-api-lyart.vercel.app.
Once the canonical web domain is known, set AUTH_URL and APP_ORIGIN to its HTTPS
origin. Update API APP_ORIGIN and CORS_ORIGIN to that origin and redeploy both.
Never set a production AUTH_URL to localhost or a guessed domain.

Google OAuth authorized redirect URIs:
- https://<actual-web-domain>/api/auth/callback/google
- https://seo-machine-api-lyart.vercel.app/api/v1/integrations/google-search-console/callback

Set API GSC_REDIRECT_URI to the second URI. Keep GSC_SYNC_ENABLED=false on Vercel.
Do not share production database credentials with untrusted preview deployments.
Health endpoint success does not prove database or Google connectivity.

References:
- https://supabase.com/docs/guides/database/prisma
- https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting
