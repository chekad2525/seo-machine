import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { prisma } from '@seo-machine/db';
import { ExactRankService, exactRankConfiguration } from './exact-rank.service';

@Injectable()
export class KeywordRankSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KeywordRankSchedulerService.name);
  private timer?: ReturnType<typeof setInterval>;
  private active = false;
  private stopped = false;

  constructor(private readonly rankService: ExactRankService) {}

  onModuleInit() {
    if (process.env.SERP_SYNC_ENABLED !== 'true') return;
    if (!exactRankConfiguration().configured) {
      this.logger.warn('Scheduled keyword ranks are enabled, but the selected provider is not configured.');
      return;
    }
    this.timer = setInterval(() => { void this.tick(); }, 15 * 60_000);
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
      const config = exactRankConfiguration();
      if (!config.configured) return;
      if (config.provider === 'dataforseo') {
        const pending = await prisma.keywordSerpTask.findMany({
          where: { status: 'PENDING' },
          select: { trackedKeyword: { select: { projectId: true, userId: true } } },
          orderBy: { requestedAt: 'asc' }, take: 100,
        });
        const projects = new Map(pending.map((item) => [`${item.trackedKeyword.projectId}:${item.trackedKeyword.userId}`, item.trackedKeyword]));
        for (const project of projects.values()) {
          if (this.stopped) break;
          try { await this.rankService.collect(project.userId, project.projectId); }
          catch { this.logger.warn(`Could not collect scheduled rank results for project ${project.projectId}.`); }
        }
      }
      const now = new Date();
      const checkDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const due = await prisma.trackedKeyword.findMany({
        where: { rankSnapshots: { none: { checkDate } }, serpTasks: { none: { checkDate } } },
        select: { projectId: true, userId: true },
        distinct: ['projectId', 'userId'], orderBy: { createdAt: 'asc' }, take: 10,
      });
      for (const project of due) {
        if (this.stopped) break;
        try { await this.rankService.enqueue(project.userId, project.projectId); }
        catch { this.logger.warn(`Scheduled rank check failed for project ${project.projectId}.`); }
      }
    } catch {
      this.logger.error('Could not scan scheduled keyword ranks.');
    } finally {
      this.active = false;
    }
  }
}
