import { prisma } from '@seo-machine/db';
import { decryptToken, encryptToken } from './search-console.service';
import { SearchConsoleTokenService } from './search-console-token.service';

jest.mock('@seo-machine/db', () => ({ prisma: { searchConsoleConnection: { findFirst: jest.fn(), updateMany: jest.fn() } } }));

describe('Google access token lifecycle', () => {
  const originalFetch = global.fetch;
  const originalClientId = process.env.GSC_CLIENT_ID;
  const originalClientSecret = process.env.GSC_CLIENT_SECRET;
  const find = prisma.searchConsoleConnection.findFirst as jest.Mock;
  const update = prisma.searchConsoleConnection.updateMany as jest.Mock;
  const service = new SearchConsoleTokenService();

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.GSC_CLIENT_ID = 'test-client';
    process.env.GSC_CLIENT_SECRET = 'test-secret';
    find.mockResolvedValue({ accessTokenEnc: encryptToken('old-access'), refreshTokenEnc: encryptToken('old-refresh'), expiresAt: new Date(0) });
    update.mockResolvedValue({ count: 1 });
    global.fetch = jest.fn();
  });
  afterAll(() => {
    global.fetch = originalFetch;
    if (originalClientId === undefined) delete process.env.GSC_CLIENT_ID; else process.env.GSC_CLIENT_ID = originalClientId;
    if (originalClientSecret === undefined) delete process.env.GSC_CLIENT_SECRET; else process.env.GSC_CLIENT_SECRET = originalClientSecret;
  });

  it('reuses unexpired access without sending the refresh token', async () => {
    find.mockResolvedValue({ accessTokenEnc: encryptToken('valid'), expiresAt: new Date(Date.now() + 120_000) });
    await expect(service.accessToken('connection', 'lease')).resolves.toBe('valid');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('encrypts refreshed access and preserves refresh token when Google omits rotation', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(Response.json({ access_token: 'new-access', expires_in: 3600 }));
    await expect(service.accessToken('connection', 'lease')).resolves.toBe('new-access');
    const saved = update.mock.calls[0][0];
    expect(decryptToken(saved.data.accessTokenEnc)).toBe('new-access');
    expect(saved.data.refreshTokenEnc).toBeUndefined();
    expect(saved.where.syncLeaseId).toBe('lease');
    expect((global.fetch as jest.Mock).mock.calls[0][1].body.get('grant_type')).toBe('refresh_token');
  });

  it('stores a rotated refresh token encrypted', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(Response.json({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 3600 }));
    await service.accessToken('connection', 'lease', true);
    expect(decryptToken(update.mock.calls[0][0].data.refreshTokenEnc)).toBe('new-refresh');
  });

  it('revokes invalid grants but keeps transient provider failures retryable', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(Response.json({ error: 'invalid_grant' }, { status: 400 }));
    await expect(service.accessToken('connection', 'lease')).rejects.toThrow('revoked');
    expect(update.mock.calls[0][0].data).toMatchObject({ status: 'REVOKED', refreshTokenEnc: null });
    update.mockClear();
    (global.fetch as jest.Mock).mockResolvedValue(Response.json({ error: 'provider secret details' }, { status: 503 }));
    await expect(service.accessToken('connection', 'lease')).rejects.toThrow('temporarily unavailable');
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a refresh result if the connection lease was replaced', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(Response.json({ access_token: 'new-access', expires_in: 3600 }));
    update.mockResolvedValue({ count: 0 });
    await expect(service.accessToken('connection', 'lease')).rejects.toThrow('ownership changed');
  });
});
