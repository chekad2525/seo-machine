import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';

export type InternalScope = 'user' | 'identity';
export type InternalRequest = { method: string; target: string; body?: string | Buffer };
export const INTERNAL_CLOCK_WINDOW_MS = 30_000;

export function internalApiSecret(): string {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32 || /^(replace|change|example)/i.test(secret)) {
    throw new Error('INTERNAL_API_SECRET must be a separate random secret of at least 32 bytes.');
  }
  return secret;
}

function signature(request: InternalRequest, fields: string[], secret: string) {
  const bodyHash = createHash('sha256').update(request.body ?? '').digest('hex');
  return createHmac('sha256', secret).update(JSON.stringify(['seo-machine-internal-v1', ...fields, request.method.toUpperCase(), request.target, bodyHash])).digest('hex');
}

export function signInternalRequest(request: InternalRequest, identity: { scope: InternalScope; userId?: string }, secret: string, now = Date.now(), nonce = randomUUID()) {
  const timestamp = String(now);
  const userId = identity.userId ?? '';
  if ((identity.scope === 'user' && !/^[A-Za-z0-9_-]{1,128}$/.test(userId)) || (identity.scope === 'identity' && userId !== '')) throw new Error('Invalid internal identity.');
  return {
    'x-internal-time': timestamp,
    'x-internal-nonce': nonce,
    'x-internal-scope': identity.scope,
    'x-internal-user': userId,
    'x-internal-signature': signature(request, [timestamp, nonce, identity.scope, userId], secret),
  };
}

export function verifyInternalRequest(request: InternalRequest, headers: Record<string, string | undefined>, secret: string, now = Date.now()) {
  const timestamp = headers['x-internal-time'] ?? '';
  const nonce = headers['x-internal-nonce'] ?? '';
  const scope = headers['x-internal-scope'];
  const userId = headers['x-internal-user'] ?? '';
  const supplied = headers['x-internal-signature'] ?? '';
  if (!/^\d{13}$/.test(timestamp) || Math.abs(now - Number(timestamp)) > INTERNAL_CLOCK_WINDOW_MS) return null;
  if (!/^[a-f0-9-]{36}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(supplied)) return null;
  if (scope !== 'user' && scope !== 'identity') return null;
  if (scope === 'user' ? !/^[A-Za-z0-9_-]{1,128}$/.test(userId) : userId !== '') return null;
  const expected = signature(request, [timestamp, nonce, scope, userId], secret);
  if (!timingSafeEqual(Buffer.from(supplied, 'hex'), Buffer.from(expected, 'hex'))) return null;
  return { scope, userId, nonce, expiresAt: new Date(Number(timestamp) + INTERNAL_CLOCK_WINDOW_MS + 1) };
}
