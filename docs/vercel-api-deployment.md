# API deployment on Vercel

Import the whole monorepo, using the NestJS preset and `apps/api` as the Root Directory.
Enable **Include source files outside of the Root Directory in the Build Step** so
`packages/db`, the root workspace manifests, and `tsconfig.base.json` are available.
Keep Build Command as `npm run build` and the framework's default Output Directory.

The API's `prebuild` generates Prisma Client and compiles `@seo-machine/db` before
NestJS builds. API and database production TypeScript configurations exclude tests;
the normal typecheck and Jest configurations still include them.

Push the updated files to GitHub before redeploying. Redeploy the new commit,
not the old failing deployment. Do not upload `.env` or client-secret JSON files.

Build success does not establish runtime readiness. Configure an online PostgreSQL
`DATABASE_URL` and set `INTERNAL_API_SECRET`, `OTP_HASH_SECRET`, `TOKEN_ENCRYPTION_KEY`,
`GSC_CLIENT_ID`, `GSC_CLIENT_SECRET`, `GSC_REDIRECT_URI`, `APP_ORIGIN`, and `CORS_ORIGIN`.
The redirect URI must use the deployed API domain and match the Google OAuth client.
APP_ORIGIN and CORS_ORIGIN must use the deployed web domain.

Keep `GSC_SYNC_ENABLED=false` and `SERP_SYNC_ENABLED=false` on Vercel because interval
schedulers require a persistent process. Keyword ranks use the daily Vercel Cron entry
in `apps/api/vercel.json`; set `CRON_SECRET` so Vercel can authenticate that request.
Manual Search Console sync can still be tested within function duration limits.

The API prebuild runs `prisma migrate deploy` only when Vercel exposes
`VERCEL_ENV=production`. Local, Development, and Preview builds skip database
migrations. A failed production migration stops the deployment instead of serving code
that expects tables which do not exist. If `DIRECT_URL` exists, the migration process
uses it while the deployed application continues to use `DATABASE_URL`. For Supabase,
keep the transaction pooler URL on port `6543` in `DATABASE_URL` and use the Direct
connection or shared Session Pooler URL on port `5432` in `DIRECT_URL`.

For keyword tracking with Serper, set `SERP_PROVIDER=serper` and `SERPER_API_KEY`.
For DataForSEO, set `SERP_PROVIDER=dataforseo`, `DATAFORSEO_LOGIN`, and
`DATAFORSEO_PASSWORD`. Country, language, location, and device are selected inside
each project's keyword tracker instead of environment variables. Serper tracking is
desktop-only in this application; DataForSEO supports desktop and mobile. Use the API
login and generated API password from DataForSEO's API Access page (the API password
is different from the account password), and verify the DataForSEO account before the
first request. Add these variables to the deployed **API project**, for Production,
Preview, and Development as needed, then redeploy the API.

Check `/api/v1/health` after deployment, then test authenticated application requests
and the Google connection. Preview builds never apply database migrations.

References:
- https://vercel.com/docs/frameworks/backend/nestjs
- https://vercel.com/docs/monorepos
