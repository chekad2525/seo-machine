import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { prisma } from '@seo-machine/db';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

export const GSC_READONLY_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
export const GSC_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GSC_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

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
  async list(userId: string, projectId: string) {
    return prisma.searchConsoleConnection.findMany({ where: { projectId, userId }, select: { id: true, projectId: true, property: true, status: true, scopes: true, expiresAt: true, createdAt: true, updatedAt: true } });
  }

  async prepare(userId: string, projectId: string, property: string) {
    const cleanProperty = property.trim();
    const project = await prisma.project.findFirst({ where: { id: projectId, workspace: { organization: { memberships: { some: { userId } } } } } });
    if (!project) throw new NotFoundException('Project not found.');
    if (!cleanProperty) throw new BadRequestException('A Search Console property is required.');
    const connection = await prisma.searchConsoleConnection.upsert({ where: { projectId_property: { projectId, property: cleanProperty } }, create: { projectId, userId, property: cleanProperty, scopes: [GSC_READONLY_SCOPE], status: 'PENDING' }, update: { userId, scopes: [GSC_READONLY_SCOPE], status: 'PENDING' } });
    const state = base64Url(randomBytes(32));
    const codeVerifier = base64Url(randomBytes(32));
    await prisma.searchConsoleOAuthState.create({ data: { stateHash: hashOAuthState(state), codeVerifierEnc: encryptToken(codeVerifier), projectId, userId, property: cleanProperty, expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
    return { ...connection, authorizationUrl: this.authorizationUrl(state, codeVerifier, cleanProperty) };
  }

  async completeCallback(state: string, code: string, error?: string) {
    if (error) throw new BadRequestException(`Google authorization was not completed: ${error}.`);
    if (!state || !code) throw new BadRequestException('The Google authorization response is incomplete.');
    const pending = await prisma.searchConsoleOAuthState.findFirst({ where: { stateHash: hashOAuthState(state), consumedAt: null, expiresAt: { gt: new Date() } } });
    if (!pending) throw new UnauthorizedException('The Search Console authorization state is invalid or expired.');
    const claimed = await prisma.$transaction(async (tx) => {
      const result = await tx.searchConsoleOAuthState.updateMany({ where: { id: pending.id, consumedAt: null }, data: { consumedAt: new Date() } });
      if (result.count !== 1) throw new UnauthorizedException('The Search Console authorization state was already used.');
      return pending;
    });
    const tokenResponse = await fetch(GSC_TOKEN_ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: this.required('GSC_CLIENT_ID'), client_secret: this.required('GSC_CLIENT_SECRET'), redirect_uri: this.redirectUri(), grant_type: 'authorization_code', code_verifier: decryptToken(claimed.codeVerifierEnc) }) });
    const tokens = await tokenResponse.json() as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string };
    if (!tokenResponse.ok || !tokens.access_token) { await this.markError(claimed); throw new BadRequestException(tokens.error ?? 'Google did not return an access token.'); }
    const verified = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(claimed.property)}`, { headers: { authorization: `Bearer ${tokens.access_token}` } });
    if (!verified.ok) { await this.markError(claimed); throw new BadRequestException('Google granted access, but the property could not be verified for this account.'); }
    const connection = await prisma.searchConsoleConnection.update({ where: { projectId_property: { projectId: claimed.projectId, property: claimed.property } }, data: { status: 'CONNECTED', accessTokenEnc: encryptToken(tokens.access_token), refreshTokenEnc: tokens.refresh_token ? encryptToken(tokens.refresh_token) : undefined, expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null } });
    return { projectId: connection.projectId, property: connection.property, status: connection.status };
  }

  private authorizationUrl(state: string, codeVerifier: string, property: string) {
    const params = new URLSearchParams({ client_id: this.required('GSC_CLIENT_ID'), redirect_uri: this.redirectUri(), response_type: 'code', access_type: 'offline', prompt: 'consent', scope: GSC_READONLY_SCOPE, state, code_challenge: base64Url(createHash('sha256').update(codeVerifier).digest()), code_challenge_method: 'S256', login_hint: property });
    return `${GSC_AUTHORIZATION_ENDPOINT}?${params.toString()}`;
  }

  private async markError(state: { projectId: string; property: string; userId: string }) { await prisma.searchConsoleConnection.updateMany({ where: { projectId: state.projectId, property: state.property, userId: state.userId }, data: { status: 'ERROR' } }); }
  private redirectUri() { return process.env.GSC_REDIRECT_URI ?? 'http://localhost:3001/api/v1/integrations/google-search-console/callback'; }
  private required(name: 'GSC_CLIENT_ID' | 'GSC_CLIENT_SECRET') { const value = process.env[name]; if (!value) throw new BadRequestException(`${name} is not configured.`); return value; }
}
