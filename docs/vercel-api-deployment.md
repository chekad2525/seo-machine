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
`DATABASE_URL`, apply migrations separately (`npm run db:migrate` at repository root),
and set `INTERNAL_API_SECRET`, `OTP_HASH_SECRET`, `TOKEN_ENCRYPTION_KEY`,
`GSC_CLIENT_ID`, `GSC_CLIENT_SECRET`, `GSC_REDIRECT_URI`, `APP_ORIGIN`, and `CORS_ORIGIN`.
The redirect URI must use the deployed API domain and match the Google OAuth client.
APP_ORIGIN and CORS_ORIGIN must use the deployed web domain.

Keep `GSC_SYNC_ENABLED=false` on Vercel: the current interval scheduler requires a
persistent process. Manual sync can be tested within function duration limits;
scheduled ingestion needs a separate cron/worker integration.

Check `/api/v1/health` after deployment, then test authenticated application requests
and the Google connection. Do not run database migrations automatically in preview builds.

References:
- https://vercel.com/docs/frameworks/backend/nestjs
- https://vercel.com/docs/monorepos
