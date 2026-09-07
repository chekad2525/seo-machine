import { prisma } from '@seo-machine/db';
import { decryptToken, encryptToken, SearchConsoleService } from './search-console.service';

jest.mock('@seo-machine/db', () => ({ prisma: {
  project: { findFirst: jest.fn() },
  searchConsoleConnection: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  searchConsoleOAuthState: { create: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn() },
  $transaction: jest.fn(),
} }));

describe('Search Console callback regressions', () => {
  const service = new SearchConsoleService();
  const originalFetch = global.fetch;
  const originalId = process.env.GSC_CLIENT_ID;
  const originalSecret = process.env.GSC_CLIENT_SECRET;
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.GSC_CLIENT_ID = 'test-client'; process.env.GSC_CLIENT_SECRET = 'test-secret';
    (prisma.project.findFirst as jest.Mock).mockResolvedValue({ id: 'project' });
    (prisma.searchConsoleOAuthState.findFirst as jest.Mock).mockResolvedValue({ id: 'state', projectId: 'project', userId: 'user', property: 'sc-domain:example.com', codeVerifierEnc: encryptToken('verifier') });
    (prisma.searchConsoleOAuthState.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.searchConsoleConnection.findUnique as jest.Mock).mockResolvedValue({ id: 'pending' });
    (prisma.searchConsoleConnection.findFirst as jest.Mock).mockResolvedValue({ id: 'canonical', projectId: 'project', userId: 'user', property: 'https://example.com/', status: 'CONNECTED' });
    (prisma.searchConsoleConnection.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 'canonical', ...data }));
    (prisma.searchConsoleConnection.update as jest.Mock).mockImplementation(async ({ data }) => ({ id: 'canonical', projectId: 'project', userId: 'user', property: 'https://example.com/', ...data }));
    (prisma.$transaction as jest.Mock).mockImplementation(async callback => callback(prisma));
    global.fetch = jest.fn()
      .mockResolvedValueOnce(Response.json({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 3600 }))
      .mockResolvedValueOnce(Response.json({ siteEntry: [{ siteUrl: 'https://example.com/', permissionLevel: 'siteOwner' }] }));
  });
  afterAll(() => {
    global.fetch = originalFetch;
    if (originalId === undefined) delete process.env.GSC_CLIENT_ID; else process.env.GSC_CLIENT_ID = originalId;
    if (originalSecret === undefined) delete process.env.GSC_CLIENT_SECRET; else process.env.GSC_CLIENT_SECRET = originalSecret;
  });
  it('keeps a working connection intact when a new authorization starts', async () => {
    await service.prepare('user', 'project', 'example.com');
    expect(prisma.searchConsoleConnection.findFirst).toHaveBeenCalledWith({ where: { projectId: 'project', userId: 'user', property: 'https://example.com/' } });
    expect(prisma.searchConsoleConnection.create).not.toHaveBeenCalled();
  });
  it('updates the canonical property without relying on database conflict inference', async () => {
    await expect(service.completeCallback('state', 'code')).resolves.toMatchObject({ status: 'CONNECTED', property: 'https://example.com/' });
    const write = (prisma.searchConsoleConnection.update as jest.Mock).mock.calls[0][0];
    expect(write.where).toEqual({ id: 'canonical' });
    expect(decryptToken(write.data.refreshTokenEnc)).toBe('new-refresh');
  });
  it('does not exchange the same code twice', async () => {
    (prisma.searchConsoleOAuthState.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    await expect(service.completeCallback('state', 'code')).rejects.toThrow('already used');
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('checks membership again before storing access', async () => {
    (prisma.project.findFirst as jest.Mock).mockResolvedValueOnce({ id: 'project' }).mockResolvedValueOnce(null);
    await expect(service.completeCallback('state', 'code')).rejects.toThrow('access was removed');
    expect(prisma.searchConsoleConnection.update).not.toHaveBeenCalled();
    expect(prisma.searchConsoleConnection.create).not.toHaveBeenCalled();
  });
  it('does not call an HTML 403 proof of disabled API or a VPN failure', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(Response.json({ access_token: 'a', refresh_token: 'r', expires_in: 3600 })).mockResolvedValueOnce(new Response('<html>Forbidden</html>', { status: 403, headers: { 'content-type': 'text/html' } }));
    await expect(service.completeCallback('state', 'code')).rejects.toMatchObject({ reason: 'upstream-rejected' });
    expect(prisma.searchConsoleConnection.update).not.toHaveBeenCalled();
    expect(prisma.searchConsoleConnection.create).not.toHaveBeenCalled();
    expect(prisma.searchConsoleConnection.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: { not: 'CONNECTED' } }) }));
  });
  it('does not replace a connection with a token from a different grant lacking refresh access', async () => {
    global.fetch = jest.fn().mockResolvedValue(Response.json({ access_token: 'other-account', expires_in: 3600 }));
    await expect(service.completeCallback('state', 'code')).rejects.toMatchObject({ reason: 'offline-access-required' });
    expect(prisma.searchConsoleConnection.update).not.toHaveBeenCalled();
    expect(prisma.searchConsoleConnection.create).not.toHaveBeenCalled();
  });
});
