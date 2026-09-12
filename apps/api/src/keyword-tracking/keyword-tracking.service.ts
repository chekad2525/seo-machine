import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@seo-machine/db';
import { exactRankConfiguration } from '../search-console/exact-rank.service';
import { buildKeywordSuggestions, buildKeywordTracking } from '../search-console/keyword-tracking';

function formatDate(date: Date) { return date.toISOString().slice(0, 10); }

function trackingRange(now = new Date()) {
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 2));
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - 27);
  return { startDate, endDate };
}

@Injectable()
export class KeywordTrackingService {
  async report(userId: string, projectId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, workspace: { organization: { memberships: { some: { userId } } } } },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Project not found.');
    const connection = await prisma.searchConsoleConnection.findFirst({ where: { projectId, userId }, select: { id: true } });
    const range = trackingRange();
    const [tracked, metrics] = await Promise.all([
      prisma.trackedKeyword.findMany({
        where: { projectId, userId },
        select: {
          id: true, query: true, targetPage: true, createdAt: true,
          rankSnapshots: { select: { provider: true, rankAbsolute: true, rankGroup: true, resultUrl: true, checkedAt: true, checkDate: true, device: true, locationCode: true }, orderBy: { checkedAt: 'desc' }, take: 30 },
          serpTasks: { select: { status: true, errorMessage: true, requestedAt: true }, orderBy: { requestedAt: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'asc' },
      }),
      connection ? prisma.searchConsoleQueryMetric.findMany({ where: { connectionId: connection.id, date: { gte: range.startDate, lte: range.endDate } }, select: { date: true, query: true, clicks: true, impressions: true, position: true } }) : Promise.resolve([]),
    ]);
    const keywords = buildKeywordTracking(tracked.map(({ rankSnapshots: _rankSnapshots, serpTasks: _serpTasks, ...item }) => item), metrics).map((item) => {
      const source = tracked.find((trackedItem) => trackedItem.id === item.id)!;
      const [latest, previous] = source.rankSnapshots;
      return {
        ...item,
        exact: latest ? {
          rank: latest.rankAbsolute,
          groupRank: latest.rankGroup,
          provider: latest.provider,
          change: latest.rankAbsolute !== null && previous?.rankAbsolute !== null && previous?.rankAbsolute !== undefined ? latest.rankAbsolute - previous.rankAbsolute : null,
          resultUrl: latest.resultUrl,
          checkedAt: latest.checkedAt.toISOString(),
          device: latest.device,
          locationCode: latest.locationCode,
        } : null,
        exactHistory: [...source.rankSnapshots].reverse().map((snapshot) => ({ date: formatDate(snapshot.checkDate), rank: snapshot.rankAbsolute })),
        exactStatus: process.env.SERP_PROVIDER?.trim().toLowerCase() === 'dataforseo'
          ? source.serpTasks[0]?.status ?? null
          : latest?.provider === 'serper' ? 'COMPLETED' : null,
        exactError: process.env.SERP_PROVIDER?.trim().toLowerCase() === 'dataforseo' ? source.serpTasks[0]?.errorMessage ?? null : null,
      };
    });
    const exactConfig = exactRankConfiguration();
    const exactProvider = exactConfig.provider === 'dataforseo' ? 'DataForSEO' : 'Serper';
    return {
      range: { startDate: formatDate(range.startDate), endDate: formatDate(range.endDate) },
      gscConnected: Boolean(connection),
      freshnessNote: connection ? 'Search Console فقط داده‌های کمکی کلیک و نمایش را با تأخیر معمول ارائه می‌کند.' : 'رهگیری رتبه واقعی مستقل از Search Console است.',
      exactRankNote: `جایگاه واقعی دسکتاپ با ${exactProvider} و موقعیت جغرافیایی تنظیم‌شده از نتایج گوگل خوانده می‌شود.`,
      exactRankReady: exactConfig.configured,
      keywords,
      suggestions: buildKeywordSuggestions(metrics, new Set(tracked.map((item) => item.query))),
    };
  }

  async add(userId: string, projectId: string, query: string, targetPage?: string) {
    const project = await prisma.project.findFirst({ where: { id: projectId, workspace: { organization: { memberships: { some: { userId } } } } }, select: { id: true } });
    if (!project) throw new NotFoundException('Project not found.');
    const normalized = query.trim().replace(/\s+/g, ' ');
    if (!normalized) throw new BadRequestException('Keyword is required.');
    const normalizedTarget = this.validateTargetPage(targetPage);
    const existing = await prisma.trackedKeyword.findUnique({ where: { projectId_userId_query: { projectId, userId, query: normalized } }, select: { id: true } });
    if (!existing) {
      const count = await prisma.trackedKeyword.count({ where: { projectId, userId } });
      if (count >= 100) throw new BadRequestException('A project can track up to 100 keywords.');
    }
    return prisma.trackedKeyword.upsert({
      where: { projectId_userId_query: { projectId, userId, query: normalized } },
      create: { projectId, userId, query: normalized, targetPage: normalizedTarget },
      update: { targetPage: normalizedTarget },
    });
  }

  async bulkAdd(userId: string, projectId: string, items: Array<{ query: string; targetPage?: string }>) {
    const project = await prisma.project.findFirst({ where: { id: projectId, workspace: { organization: { memberships: { some: { userId } } } } }, select: { id: true } });
    if (!project) throw new NotFoundException('Project not found.');
    const unique = new Map<string, { query: string; targetPage: string | null }>();
    for (const item of items) {
      const query = item.query.trim().replace(/\s+/g, ' ');
      if (!query) continue;
      unique.set(query.toLocaleLowerCase('fa'), { query, targetPage: this.validateTargetPage(item.targetPage) });
    }
    const keywords = [...unique.values()];
    if (!keywords.length) throw new BadRequestException('The spreadsheet does not contain a keyword.');
    const existing = await prisma.trackedKeyword.findMany({ where: { projectId, userId }, select: { query: true } });
    const existingQueries = new Map(existing.map((item) => [item.query.toLocaleLowerCase('fa'), item.query]));
    const imported = keywords.filter((item) => !existingQueries.has(item.query.toLocaleLowerCase('fa'))).length;
    if (existing.length + imported > 100) throw new BadRequestException(`This import exceeds the 100-keyword project limit. You can add ${Math.max(0, 100 - existing.length)} more.`);
    await prisma.$transaction(keywords.map((item) => prisma.trackedKeyword.upsert({
      where: { projectId_userId_query: { projectId, userId, query: existingQueries.get(item.query.toLocaleLowerCase('fa')) ?? item.query } },
      create: { projectId, userId, query: item.query, targetPage: item.targetPage },
      update: item.targetPage ? { targetPage: item.targetPage } : {},
    })));
    return { imported, updated: keywords.length - imported, total: existing.length + imported };
  }

  async remove(userId: string, projectId: string, id: string) {
    const result = await prisma.trackedKeyword.deleteMany({ where: { id, projectId, userId } });
    if (!result.count) throw new NotFoundException('Tracked keyword not found.');
    return { removed: true };
  }

  private validateTargetPage(targetPage?: string) {
    const value = targetPage?.trim();
    if (!value) return null;
    try {
      const url = new URL(value);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('protocol');
      return url.toString();
    } catch {
      throw new BadRequestException('Target pages must be absolute HTTP or HTTPS URLs.');
    }
  }
}
