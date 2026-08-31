# SEO Machine v0.3.1

The first real user-facing authentication website.

## Stack

- Next.js
- Auth.js (self-hosted)
- Google OAuth
- Phone OTP
- Kavenegar SMS adapter
- NestJS API
- PostgreSQL + Prisma
- Docker Compose

## Why this auth architecture?

Auth.js is free/open source and runs on SEO Machine infrastructure. Phone OTP
uses an adapter, so Kavenegar can later be replaced without rewriting auth.

## Local development

Copy:

```bash
cp .env.example .env
```

Generate two strong random values for:

```env
AUTH_SECRET=
OTP_HASH_SECRET=
```

For local phone-login testing, keep:

```env
SMS_DEV_MODE=true
```

The OTP will be printed in the NestJS API logs and no SMS credit is consumed.

Run:

```bash
docker compose up --build
```

Open:

- Landing: http://localhost:3000
- Sign in: http://localhost:3000/sign-in
- Dashboard: http://localhost:3000/dashboard
- API health: http://localhost:3001/api/v1/health

## Google OAuth

Set:

```env
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
```

Google OAuth callback:

```text
http://localhost:3000/api/auth/callback/google
```

For production replace localhost with your production domain.

## Kavenegar

Set:

```env
KAVENEGAR_API_KEY=
KAVENEGAR_VERIFY_TEMPLATE=
SMS_DEV_MODE=false
```

The VerifyLookup adapter sends the 6-digit OTP.

## Next milestone

v0.4.0:
- synchronize Google identities into SEO Machine User;
- onboarding;
- Organization/Workspace creation;
- Project creation;
- Google Search Console connection.
