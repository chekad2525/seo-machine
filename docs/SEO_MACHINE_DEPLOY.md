# SEO Machine deployment

This stage deploys the Persian website to `seomachine.ir` and the hosted app to
`app.seomachine.ir` on Cloudflare Workers. It creates separate D1, KV, R2,
Durable Object, and Workflow resources. It never adopts OpenSEO production
resources. The D1 migrations run through Alchemy during deployment.

## Before the first deployment

1. Add `seomachine.ir` to the Cloudflare account used for deployment and enable
   R2 on that account. Ensure the account can create Workers custom domains.
2. Configure Google OAuth for
   `https://app.seomachine.ir/api/auth/callback/google`.
3. Configure Loops verification, password reset, and invitation transactional
   templates. Configure Autumn products and features used by
   `src/shared/billing.ts`, and point its webhook to
   `https://app.seomachine.ir/api/autumn/webhook`.
4. Configure a Turnstile widget for both `seomachine.ir` and
   `app.seomachine.ir`. Use its matching site and secret keys in both env files.
5. Replace the upstream OpenSEO legal documents in `web/content/legal/` with
   SEO Machine's approved terms and privacy policy before public signup.
   Confirm that the published pricing and refund policy match the operator's
   actual Autumn products and business policy.

Create `.env.seomachine` from `.env.seomachine.example` and
`web/.env.seomachine` from `web/.env.seomachine.example`. Fill in the real
credentials locally. These two filled files are ignored by Git. The preflight
checks required variables, domains, support email, and matching Turnstile
site keys. `BETTER_AUTH_SECRET` must have at least 32 characters.

Run `pnpm alchemy login` and `pnpm alchemy cloudflare bootstrap` once in the
Cloudflare account. Then run `pnpm deploy:seomachine` from the repository root.

After deployment, check the home page and navigation on desktop and mobile,
app signup and email verification, Google sign-in, the billing checkout and
webhook, and a DataForSEO request. Verify both Worker custom domains in
Cloudflare and confirm that `www.seomachine.ir` resolves as intended.

The Vercel project `seo-machine-api` still points its Root Directory at the
deleted `apps/api` path. It is separate from this Cloudflare deployment. Remove
that stale setting or retire the project in Vercel after the Cloudflare routes
are live.
