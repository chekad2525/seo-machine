import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { prisma } from '@seo-machine/db';
import { decryptToken, encryptToken, GSC_TOKEN_ENDPOINT } from './search-console.service';

@Injectable()
export class SearchConsoleTokenService {
  // The caller owns the database lease for the entire sync, including refresh.
  async accessToken(connectionId: string, leaseId: string, force = false): Promise<string> {
    const connection = await prisma.searchConsoleConnection.findFirst({
      where: { id: connectionId, status: 'CONNECTED', syncLeaseId: leaseId, syncLeaseUntil: { gt: new Date() } },
    });
    if (!connection) throw new ConflictException('Search Console sync ownership changed.');
    if (!force && connection.accessTokenEnc && connection.expiresAt && connection.expiresAt.getTime() > Date.now() + 60_000) {
      return decryptToken(connection.accessTokenEnc);
    }
    if (!connection.refreshTokenEnc) throw new BadRequestException('Reconnect Search Console to enable offline access.');
    const clientId = process.env.GSC_CLIENT_ID;
    const clientSecret = process.env.GSC_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new ServiceUnavailableException('Search Console credentials are not configured.');

    let response: Response;
    try {
      response = await fetch(GSC_TOKEN_ENDPOINT, {
        method: 'POST', signal: AbortSignal.timeout(30_000),
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token', refresh_token: decryptToken(connection.refreshTokenEnc) }),
      });
    } catch {
      throw new ServiceUnavailableException('Google token refresh is temporarily unavailable.');
    }
    const payload = await response.json().catch(() => ({})) as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string };
    const owned = { id: connectionId, syncLeaseId: leaseId, syncLeaseUntil: { gt: new Date() }, status: 'CONNECTED' as const };
    if (!response.ok) {
      if (payload.error === 'invalid_grant') {
        await prisma.searchConsoleConnection.updateMany({ where: owned, data: { status: 'REVOKED', accessTokenEnc: null, refreshTokenEnc: null, expiresAt: null } });
        throw new BadRequestException('Google authorization was revoked. Reconnect Search Console.');
      }
      // Do not persist provider response bodies or secrets in errors/logs.
      throw new ServiceUnavailableException('Google token refresh is temporarily unavailable.');
    }
    if (typeof payload.access_token !== 'string' || !payload.access_token || !Number.isFinite(payload.expires_in) || Number(payload.expires_in) <= 0) {
      throw new ServiceUnavailableException('Google returned an invalid token response.');
    }
    const saved = await prisma.searchConsoleConnection.updateMany({ where: owned, data: {
      accessTokenEnc: encryptToken(payload.access_token),
      refreshTokenEnc: typeof payload.refresh_token === 'string' && payload.refresh_token ? encryptToken(payload.refresh_token) : undefined,
      expiresAt: new Date(Date.now() + Number(payload.expires_in) * 1000),
    } });
    if (saved.count !== 1) throw new ConflictException('Search Console sync ownership changed.');
    return payload.access_token;
  }
}
