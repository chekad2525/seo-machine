# RFC-002 — Self-hosted Web Authentication

Status: Implemented in v0.3.1

## Decision

Use Auth.js inside the Next.js application instead of a hosted authentication
SaaS. Auth.js remains an external library, not a core domain dependency.

## Login methods

1. Google OAuth through Auth.js.
2. Iranian mobile number (+98) through a custom Credentials provider.
3. SMS OTP delivery through an `SmsProvider` adapter.
4. Kavenegar is the first production SMS adapter.

## Why

- Auth.js is free and open source.
- Authentication logic runs on SEO Machine infrastructure.
- SMS infrastructure remains replaceable.
- Kavenegar can serve Iranian mobile numbers without depending on a foreign
  identity SaaS.

## Security

- OTP values are never stored in plaintext.
- HMAC-SHA256 hashes are stored.
- OTP expires after five minutes.
- Resend is limited to once per minute.
- Verification is limited to five attempts.
- Constant-time comparison is used.
- Successful challenges are consumed.
- Google secret, Auth.js secret, SMS API key and OTP hash secret are server-only.

## Development mode

`SMS_DEV_MODE=true` prints the OTP to the API server log when Kavenegar is not
configured. This must be disabled in production.

## Future

The SMS adapter interface can support SMS.ir, Melipayamak or another provider
without changing the authentication domain.
