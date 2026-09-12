import 'server-only';
import { internalApiSecret, signInternalRequest } from '@seo-machine/db/web';

type Options = { method?: 'GET' | 'POST'; body?: string; userId?: string; identity?: boolean };

export async function internalApiFetch(target: string, options: Options = {}) {
  if (!target.startsWith('/api/v1/') || target.includes('://') || target.includes('#') || target.includes('\\')) throw new Error('Invalid internal API target.');
  const base = new URL(process.env.API_INTERNAL_URL ?? 'http://localhost:3001');
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) throw new Error('Invalid API_INTERNAL_URL.');
  const url = new URL(target, base.origin);
  const method = options.method ?? 'GET';
  const scope = options.identity ? 'identity' : 'user';
  const headers = signInternalRequest({ method, target: url.pathname + url.search, body: options.body }, { scope, userId: options.userId }, internalApiSecret());
  return fetch(url, { method, headers: { ...headers, 'content-type': 'application/json' }, body: options.body, cache: 'no-store', redirect: 'error' });
}

export function acceptsBrowserMutation(request: Request) {
  // Do not trust Host / forwarded headers for the CSRF origin decision.
  const configured = process.env.APP_ORIGIN ?? (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');
  if (!configured) return false;
  const origin = request.headers.get('origin');
  return origin === new URL(configured).origin && request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() === 'application/json';
}
