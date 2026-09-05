import { ConflictException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { prisma } from '@seo-machine/db';
import { SearchConsoleSyncService } from './search-console-sync.service';

@Injectable()
export class SearchConsoleSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SearchConsoleSchedulerService.name);
  private timer?: ReturnType<typeof setInterval>;
  private active = false;
  private stopped = false;

  constructor(private readonly syncService: SearchConsoleSyncService) {}

  onModuleInit() {
    if (process.env.GSC_SYNC_ENABLED !== 'true') return;
    this.timer = setInterval(() => { void this.tick(); }, 60_000);
    this.timer.unref();
    void this.tick();
  }

  onModuleDestroy() {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
  }

  async tick() {
    if (this.active || this.stopped) return;
    this.active = true;
    try {
      const now = new Date();
      const due = await prisma.searchConsoleConnection.findMany({
        where: { status: 'CONNECTED', nextSyncAt: { lte: now }, OR: [{ syncLeaseUntil: null }, { syncLeaseUntil: { lte: now } }] },
        select: { id: true, userId: true, projectId: true }, orderBy: [{ nextSyncAt: 'asc' }, { id: 'asc' }], take: 10,
      });
      for (const connection of due) {
        if (this.stopped) break;
        try {
          await this.syncService.sync(connection.userId, connection.projectId, undefined, connection.id, true);
        } catch (error) {
          if (error instanceof NotFoundException) await prisma.searchConsoleConnection.updateMany({ where: { id: connection.id, userId: connection.userId, nextSyncAt: { lte: now } }, data: { nextSyncAt: new Date(Date.now() + 24 * 60 * 60_000) } });
          if (!(error instanceof ConflictException)) this.logger.warn(`Scheduled sync failed for connection ${connection.id}; a later tick may retry.`);
        }
      }
    } catch {
      this.logger.error('Could not scan scheduled Search Console connections.');
    } finally {
      this.active = false;
    }
  }
}
