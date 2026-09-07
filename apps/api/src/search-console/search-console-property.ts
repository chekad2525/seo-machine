import { BadRequestException } from '@nestjs/common';

export type GoogleSite = { siteUrl?: string; permissionLevel?: string };

export function normalizeProperty(value: string): string {
  const input = value.trim();
  if (!input) throw new BadRequestException('A Search Console property is required.');
  const domainProperty = input.startsWith('sc-domain:');
  try {
    const url = new URL(domainProperty ? `https://${input.slice(10)}` : input.includes('://') ? input : `https://${input}`);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error();
    if (domainProperty && (url.pathname !== '/' || url.port)) throw new Error();
    return domainProperty ? `sc-domain:${url.hostname}` : url.href;
  } catch {
    throw new BadRequestException('Invalid Search Console property.');
  }
}

export function matchAccessibleProperty(requested: string, entries: GoogleSite[]): string | null {
  const available = entries.filter(entry => entry.permissionLevel !== 'siteUnverifiedUser' && typeof entry.siteUrl === 'string');
  const normalized = normalizeProperty(requested);
  const exact = available.find(entry => entry.siteUrl === normalized);
  if (exact) return exact.siteUrl!;
  if (normalized.startsWith('sc-domain:')) {
    // A domain property can fall back to a verified root URL, never another hostname.
    const domain = normalized.slice(10);
    for (const candidate of [`https://${domain}/`, `http://${domain}/`]) {
      if (available.some(entry => entry.siteUrl === candidate)) return candidate;
    }
    return null;
  }
  const url = new URL(normalized);
  // Only an exact-host domain property is an automatic substitute. Broader parents
  // and different www/subdomain properties require an explicit user selection.
  if (url.pathname === '/' && !url.port) {
    const candidate = `sc-domain:${url.hostname}`;
    if (available.some(entry => entry.siteUrl === candidate)) return candidate;
  }
  return null;
}
