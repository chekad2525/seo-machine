import { prisma } from '@seo-machine/db';
import { SearchConsoleSchedulerService } from './search-console-scheduler.service';
import { SearchConsoleSyncService } from './search-console-sync.service';

jest.mock('@seo-machine/db', () => ({ prisma: { searchConsoleConnection: { findMany: jest.fn() } } }));

describe('Search Console scheduler', () => {
  afterEach(() => { jest.restoreAllMocks(); });

  it('does not start a timer unless explicitly enabled', () => {
    const old = process.env.GSC_SYNC_ENABLED;
    delete process.env.GSC_SYNC_ENABLED;
    const timer = jest.spyOn(global, 'setInterval');
    const scheduler = new SearchConsoleSchedulerService({} as SearchConsoleSyncService);
    scheduler.onModuleInit();
    expect(timer).not.toHaveBeenCalled();
    scheduler.onModuleDestroy();
    if (old !== undefined) process.env.GSC_SYNC_ENABLED = old;
  });

  it('passes the exact connection to sync and prevents overlapping local scans', async () => {
    const find = prisma.searchConsoleConnection.findMany as jest.Mock;
    find.mockReset().mockResolvedValue([{ id: 'property-2', userId: 'owner', projectId: 'project' }]);
    let finish!: () => void;
    const sync = jest.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const scheduler = new SearchConsoleSchedulerService({ sync } as unknown as SearchConsoleSyncService);
    const active = scheduler.tick();
    await Promise.resolve();
    await scheduler.tick();
    expect(find).toHaveBeenCalledTimes(1);
    expect(sync).toHaveBeenCalledWith('owner', 'project', undefined, 'property-2', true);
    finish();
    await active;
    scheduler.onModuleDestroy();
    await scheduler.tick();
    expect(find).toHaveBeenCalledTimes(1);
  });
});
