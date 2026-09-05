import { prisma } from '@seo-machine/db';
import { SearchConsoleSyncService } from './search-console-sync.service';
import { SearchConsoleTokenService } from './search-console-token.service';

jest.mock('@seo-machine/db', () => ({ prisma: {
  searchConsoleConnection: { findFirst: jest.fn(), updateMany: jest.fn() },
  searchConsoleSyncRun: { create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  searchConsoleQueryMetric: { deleteMany: jest.fn(), createMany: jest.fn() },
  searchConsolePageMetric: { deleteMany: jest.fn(), createMany: jest.fn() },
  $transaction: jest.fn(),
} }));

describe('Sync failure and retry boundaries', () => {
  const originalFetch = global.fetch;
  const accessToken = jest.fn();
  const service = new SearchConsoleSyncService({ accessToken } as SearchConsoleTokenService);

  beforeEach(() => {
    jest.resetAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => callback(prisma));
    (prisma.searchConsoleConnection.findFirst as jest.Mock).mockResolvedValue({ id: 'conn', property: 'sc-domain:example.test' });
    (prisma.searchConsoleConnection.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.searchConsoleSyncRun.create as jest.Mock).mockResolvedValue({ id: 'run' });
    accessToken.mockResolvedValue('access');
    global.fetch = jest.fn(async () => Response.json({ rows: [] }));
  });
  afterAll(() => { global.fetch = originalFetch; });

  it('stops before contacting Google when another worker owns the lease', async () => {
    (prisma.searchConsoleConnection.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    await expect(service.sync('user', 'project')).rejects.toThrow('already running');
    expect(global.fetch).not.toHaveBeenCalled();
    expect(prisma.searchConsoleSyncRun.create).not.toHaveBeenCalled();
  });

  it('forces one refresh after a 401, then continues ingestion', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(Response.json({}, { status: 401 }));
    await expect(service.sync('user', 'project')).resolves.toMatchObject({ status: 'COMPLETED' });
    expect(accessToken).toHaveBeenCalledWith('conn', expect.any(String), true);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('does not erase stored metrics or retry indefinitely on repeated 401', async () => {
    (global.fetch as jest.Mock).mockImplementation(async () => Response.json({}, { status: 401 }));
    await expect(service.sync('user', 'project')).rejects.toThrow('authorization expired');
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(prisma.searchConsoleQueryMetric.deleteMany).not.toHaveBeenCalled();
    expect(prisma.searchConsoleSyncRun.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }));
  });
});
