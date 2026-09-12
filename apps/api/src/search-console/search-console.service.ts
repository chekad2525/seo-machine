import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { prisma } from '@seo-machine/db';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { GoogleSite, matchAccessibleProperty, normalizeProperty } from './search-console-property';

export class SearchConsoleConnectionError extends BadRequestException {
  constructor(public readonly reason: string, message: string) { super(message); }
}

export const GSC_READONLY_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
export const GSC_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GSC_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
export const GSC_SITES_ENDPOINT = 'https://www.googleapis.com/webmasters/v3/sites';

function base64Url(value: Buffer) { return value.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''); }
function encryptionKey() { const secret = process.env.TOKEN_ENCRYPTION_KEY ?? (process.env.NODE_ENV === 'production' ? '' : 'local-development-token-key'); if (!secret) throw new Error('TOKEN_ENCRYPTION_KEY is required in production.'); return createHash('sha256').update(secret).digest(); }
export function hashOAuthState(state: string) { return createHash('sha256').update(state).digest('hex'); }

export function encryptToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${base64Url(iv)}.${base64Url(cipher.getAuthTag())}.${base64Url(encrypted)}`;
}

export function decryptToken(value: string) {
  const [iv, tag, encrypted] = value.split('.').map((part) => Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - part.length % 4) % 4), 'base64'));
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

@Injectable()
export class SearchConsoleService {
  private readonly logger = new Logger(SearchConsoleService.name);
  async list(userId: string, projectId: string) {
    return prisma.searchConsoleConnection.findMany({ where: { projectId, userId, project: { workspace: { organization: { memberships: { some: { userId } } } } } }, select: { id: true, projectId: true, property: true, status: true, scopes: true, expiresAt: true, nextSyncAt: true, createdAt: true, updatedAt: true } });
  }

  async prepare(userId: string, projectId: string, property: string) {
    const cleanProperty = normalizeProperty(property);
    const project = await prisma.project.findFirst({ where: { id: projectId, workspace: { organization: { memberships: { some: { userId } } } } } });
    if (!project) throw new NotFoundException('Project not found.');
    if (!cleanProperty) throw new BadRequestException('A Search Console property is required.');
    this.required('GSC_CLIENT_ID');
    this.required('GSC_CLIENT_SECRET');
    const existingConnection = await prisma.searchConsoleConnection.findFirst({
      where: { projectId, userId, property: cleanProperty },
    });
    const connection = existingConnection ?? await prisma.searchConsoleConnection.create({
      data: { projectId, userId, property: cleanProperty, scopes: [GSC_READONLY_SCOPE], status: 'PENDING' },
    });
    const state = base64Url(randomBytes(32));
    const codeVerifier = base64Url(randomBytes(32));
    await prisma.searchConsoleOAuthState.create({ data: { stateHash: hashOAuthState(state), codeVerifierEnc: encryptToken(codeVerifier), projectId, userId, property: cleanProperty, expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
    return { id: connection.id, projectId, property: cleanProperty, status: connection.status, authorizationUrl: this.authorizationUrl(state, codeVerifier) };
  }

  async completeCallback(state: string, code: string, error?: string) {
    if (error) throw new BadRequestException(`Google authorization was not completed: ${error}.`);
    if (!state || !code) throw new BadRequestException('The Google authorization response is incomplete.');
    const pending = await prisma.searchConsoleOAuthState.findFirst({ where: { stateHash: hashOAuthState(state), consumedAt: null, expiresAt: { gt: new Date() } } });
    if (!pending) throw new UnauthorizedException('The Search Console authorization state is invalid or expired.');
    const project = await prisma.project.findFirst({ where: { id: pending.projectId, workspace: { organization: { memberships: { some: { userId: pending.userId } } } } } });
    if (!project) throw new UnauthorizedException('Project access was removed.');
    // Claim before exchanging the single-use code, including concurrent callbacks.
    const claim = await prisma.searchConsoleOAuthState.updateMany({ where: { id: pending.id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
    if (claim.count !== 1) throw new UnauthorizedException('The Search Console authorization state was already used.');
    let tokenResponse: Response;
    try {
      tokenResponse = await fetch(GSC_TOKEN_ENDPOINT, { method: 'POST', signal: AbortSignal.timeout(30_000), redirect: 'error', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: this.required('GSC_CLIENT_ID'), client_secret: this.required('GSC_CLIENT_SECRET'), redirect_uri: this.redirectUri(), grant_type: 'authorization_code', code_verifier: decryptToken(pending.codeVerifierEnc) }) });
    } catch {
      throw new ServiceUnavailableException('Could not reach Google. Please try connecting Search Console again.');
    }
    let tokens: { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; error?: string };
    try {
      tokens = await tokenResponse.json() as typeof tokens;
    } catch {
      await this.markError(pending);
      throw new ServiceUnavailableException('Google returned an unreadable authorization response. Please try again.');
    }
    if (!tokenResponse.ok || !tokens.access_token) { await this.markError(pending); throw new BadRequestException(tokens.error ?? 'Google did not return an access token.'); }
    if (!tokens.refresh_token) throw new SearchConsoleConnectionError('offline-access-required', 'Google did not grant offline access. Reconnect and approve access.');
    if (!Number.isFinite(tokens.expires_in) || Number(tokens.expires_in) <= 0) throw new SearchConsoleConnectionError('google-unavailable', 'Google returned an invalid token expiry.');
    if (tokens.scope && !tokens.scope.split(/\s+/).some(scope => [GSC_READONLY_SCOPE, 'https://www.googleapis.com/auth/webmasters'].includes(scope))) {
      throw new SearchConsoleConnectionError('permission-denied', 'Search Console permission was not granted.');
    }
    let sitesResponse: Response;
    try {
      sitesResponse = await fetch(GSC_SITES_ENDPOINT, { signal: AbortSignal.timeout(30_000), redirect: 'error', headers: { authorization: `Bearer ${tokens.access_token}`, accept: 'application/json' } });
    } catch {
      throw new ServiceUnavailableException('Could not verify the Search Console property with Google. Please try again.');
    }
    const responseType = sitesResponse.headers.get('content-type') ?? '';
    if (!sitesResponse.ok && responseType.includes('text/html')) {
      await this.markError(pending);
      this.logger.warn(`Search Console sites.list returned HTTP ${sitesResponse.status} with HTML instead of JSON.`);
      throw new SearchConsoleConnectionError('upstream-rejected', 'Google returned an HTML error instead of an API response. The cause is not confirmed.');
    }
    const sites = await sitesResponse.json().catch(() => null) as { siteEntry?: GoogleSite[]; error?: { message?: string; errors?: Array<{ reason?: string }>; details?: Array<{ reason?: string }> } | string } | null;
    if (!sites || typeof sites !== 'object' || Array.isArray(sites)) throw new SearchConsoleConnectionError('google-unavailable', 'Google returned an invalid API response.');
    if (!sitesResponse.ok) {
      await this.markError(pending);
      const googleMessage = typeof sites.error === 'string' ? sites.error : sites.error?.message;
      this.logger.warn(`Search Console sites.list failed with HTTP ${sitesResponse.status}${googleMessage ? `: ${googleMessage}` : ''}`);
      const fallback = sitesResponse.status === 403
        ? 'Google Search Console API is disabled for this OAuth project, or this account cannot access Search Console.'
        : sitesResponse.status === 401
          ? 'Google rejected the Search Console access token. Reconnect the account and try again.'
          : `Google Search Console API returned HTTP ${sitesResponse.status}.`;
      const reasons = typeof sites.error === 'object' ? [...(sites.error.errors ?? []), ...(sites.error.details ?? [])].map(item => item.reason) : [];
      const reason = reasons.some(item => item === 'SERVICE_DISABLED' || item === 'accessNotConfigured') ? 'api-unavailable'
        : sitesResponse.status === 401 ? 'authorization-expired'
        : sitesResponse.status === 403 ? 'permission-denied' : 'google-unavailable';
      throw new SearchConsoleConnectionError(reason, fallback);
    }
    if (sites.siteEntry !== undefined && (!Array.isArray(sites.siteEntry) || sites.siteEntry.some(item => !item || typeof item.siteUrl !== 'string'))) {
      throw new SearchConsoleConnectionError('google-unavailable', 'Google returned an invalid site list.');
    }
    const verifiedProperty = matchAccessibleProperty(pending.property, sites.siteEntry ?? []);
    if (!verifiedProperty) { await this.markError(pending); throw new BadRequestException('No matching Search Console property was found for this Google account. Verify the site or add the account as an owner, then try again.'); }
    const existing = await prisma.searchConsoleConnection.findFirst({
      where: { projectId: pending.projectId, userId: pending.userId, property: pending.property },
    });
    if (!existing) throw new UnauthorizedException('The pending Search Console connection is no longer available.');
    const connection = await prisma.$transaction(async (tx) => {
      const member = await tx.project.findFirst({ where: { id: pending.projectId, workspace: { organization: { memberships: { some: { userId: pending.userId } } } } } });
      if (!member) throw new UnauthorizedException('Project access was removed.');
      const data = { status: 'CONNECTED' as const, scopes: [GSC_READONLY_SCOPE], accessTokenEnc: encryptToken(tokens.access_token!), refreshTokenEnc: encryptToken(tokens.refresh_token!), expiresAt: new Date(Date.now() + tokens.expires_in! * 1000), nextSyncAt: new Date(), syncLeaseId: null, syncLeaseUntil: null };
      // Avoid relying on PostgreSQL ON CONFLICT inference here. Some databases
      // migrated from the pre-multi-user schema may not yet expose the compound
      // unique key to Prisma even though the canonical row can be resolved.
      const currentConnection = await tx.searchConsoleConnection.findFirst({
        where: { projectId: pending.projectId, userId: pending.userId, property: verifiedProperty },
      });
      if (currentConnection) {
        return tx.searchConsoleConnection.update({ where: { id: currentConnection.id }, data });
      }
      return tx.searchConsoleConnection.create({
        data: { projectId: pending.projectId, userId: pending.userId, property: verifiedProperty, ...data },
      });
    });
    return { projectId: connection.projectId, property: connection.property, status: connection.status };
  }

  private authorizationUrl(state: string, codeVerifier: string) {
    const params = new URLSearchParams({ client_id: this.required('GSC_CLIENT_ID'), redirect_uri: this.redirectUri(), response_type: 'code', access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', scope: GSC_READONLY_SCOPE, state, code_challenge: base64Url(createHash('sha256').update(codeVerifier).digest()), code_challenge_method: 'S256' });
    return `${GSC_AUTHORIZATION_ENDPOINT}?${params.toString()}`;
  }

  private async markError(state: { projectId: string; property: string; userId: string }) { await prisma.searchConsoleConnection.updateMany({ where: { projectId: state.projectId, property: state.property, userId: state.userId, status: { not: 'CONNECTED' } }, data: { status: 'ERROR' } }); }
  private redirectUri() { return process.env.GSC_REDIRECT_URI ?? 'http://localhost:3001/api/v1/integrations/google-search-console/callback'; }
  private required(name: 'GSC_CLIENT_ID' | 'GSC_CLIENT_SECRET') { const value = process.env[name]; if (!value) throw new BadRequestException(`${name} is not configured.`); return value; }
}
