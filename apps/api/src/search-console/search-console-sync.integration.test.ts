import { randomUUID } from 'crypto';
import { prisma } from '@seo-machine/db';
import { SearchConsoleSyncService } from './search-console-sync.service';
import { SearchConsoleTokenService } from './search-console-token.service';

// Explicit opt-in: this suite seeds and removes only its own isolated tenant.
const databaseTests = process.env.RUN_DATABASE_TESTS === 'true' ? describe : describe.skip;
databaseTests('Search Console sync with PostgreSQL', () => {
  const key = randomUUID();
  const originalFetch = global.fetch;
  let userId: string;
  let organizationId: string;
  let projectId: string;
  let connectionId: string;
  const range = { startDate: new Date('2026-08-01'), endDate: new Date('2026-08-01') };
  const accessToken = jest.fn(async () => 'test-access');
  const service = new SearchConsoleSyncService({ accessToken } as SearchConsoleTokenService);

  beforeAll(async () => {
    const tenant = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: {} });
      const organization = await tx.organization.create({ data: { name: 'Sync integration', slug: key, createdById: user.id, memberships: { create: { userId: user.id, role: 'OWNER' } } } });
      const workspace = await tx.workspace.create({ data: { name: 'Test', slug: key, createdById: user.id, organizationId: organization.id } });
      const project = await tx.project.create({ data: { name: 'Test', slug: key, domain: 'example.test', createdById: user.id, organizationId: organization.id, workspaceId: workspace.id } });
      const connection = await tx.searchConsoleConnection.create({ data: { userId: user.id, projectId: project.id, property: 'sc-domain:example.test', status: 'CONNECTED', scopes: [] } });
      return { user, organization, project, connection };
    });
    userId = tenant.user.id; organizationId = tenant.organization.id;
    projectId = tenant.project.id; connectionId = tenant.connection.id;
  });

  beforeEach(() => {
    accessToken.mockReset().mockResolvedValue('test-access');
    global.fetch = jest.fn(async () => Response.json({ rows: [{ keys: ['2026-08-01', 'test-value'], clicks: 1, impressions: 10, ctr: .1, position: 2 }] }));
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    if (organizationId) await prisma.organization.delete({ where: { id: organizationId } });
    if (userId) await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('allows one owner and makes retries idempotent', async () => {
    let release!: () => void;
    let entered!: () => void;
    const started = new Promise<void>((resolve) => { entered = resolve; });
    accessToken.mockImplementationOnce(async () => {
      entered();
      await new Promise<void>((resolve) => { release = resolve; });
      return 'test-access';
    });
    const first = service.sync(userId, projectId, range, connectionId);
    // Propagate early claim failures rather than waiting indefinitely.
    await Promise.race([started, first]);
    try {
      await expect(service.sync(userId, projectId, range, connectionId)).rejects.toThrow('already running');
    } finally { release?.(); }
    await first;
    await service.sync(userId, projectId, range, connectionId);
    expect(await prisma.searchConsoleQueryMetric.count({ where: { connectionId } })).toBe(1);
    expect(await prisma.searchConsolePageMetric.count({ where: { connectionId } })).toBe(1);
    const connection = await prisma.searchConsoleConnection.findUniqueOrThrow({ where: { id: connectionId } });
    expect(connection.syncLeaseId).toBeNull();
    expect(connection.nextSyncAt.getTime()).toBeGreaterThan(Date.now());
  }, 30_000);

  it('preserves the previous window on ingestion failure and releases the lease', async () => {
    await service.sync(userId, projectId, range, connectionId);
    (global.fetch as jest.Mock).mockResolvedValueOnce(Response.json({}, { status: 503 }));
    await expect(service.sync(userId, projectId, range, connectionId)).rejects.toThrow('did not return metric data');
    expect(await prisma.searchConsoleQueryMetric.count({ where: { connectionId } })).toBe(1);
    const latest = await service.latestRun(userId, projectId);
    expect(latest?.status).toBe('FAILED');
    const connection = await prisma.searchConsoleConnection.findUniqueOrThrow({ where: { id: connectionId } });
    expect(connection.syncLeaseId).toBeNull();
  }, 30_000);

  it('rolls back window replacement when a database write fails', async () => {
    await service.sync(userId, projectId, range, connectionId);
    // Duplicate keys violate the real unique index after deleteMany has run.
    const duplicate = { keys: ['2026-08-01', 'duplicate'], clicks: 1, impressions: 10, ctr: .1, position: 2 };
    (global.fetch as jest.Mock).mockImplementation(async () => Response.json({ rows: [duplicate, duplicate] }));
    await expect(service.sync(userId, projectId, range, connectionId)).rejects.toThrow('could not be synced');
    const row = await prisma.searchConsoleQueryMetric.findFirstOrThrow({ where: { connectionId } });
    expect(row.query).toBe('test-value');
  }, 30_000);

  it('prevents an old worker from committing or releasing a replacement lease', async () => {
    await service.sync(userId, projectId, range, connectionId);
    accessToken.mockImplementationOnce(async () => {
      await prisma.searchConsoleConnection.update({ where: { id: connectionId }, data: { syncLeaseId: 'replacement-worker', syncLeaseUntil: new Date(Date.now() + 600_000) } });
      return 'test-access';
    });
    await expect(service.sync(userId, projectId, range, connectionId)).rejects.toThrow('ownership changed');
    const connection = await prisma.searchConsoleConnection.findUniqueOrThrow({ where: { id: connectionId } });
    expect(connection.syncLeaseId).toBe('replacement-worker');
    expect(await prisma.searchConsoleQueryMetric.count({ where: { connectionId } })).toBe(1);
  }, 30_000);
});
