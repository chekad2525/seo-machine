import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@seo-machine/db';
import { exactRankConfiguration } from '../search-console/exact-rank.service';
import { buildKeywordAction } from './keyword-strategy';
import { resolveKeywordTrackingSettings, trackingLocationCode, type KeywordTrackingSettings } from './keyword-tracking-settings';

function formatDate(date: Date) { return date.toISOString().slice(0, 10); }

@Injectable()
export class KeywordTrackingService {
  private async project(userId: string, projectId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, workspace: { organization: { memberships: { some: { userId } } } } },
      select: { id: true, domain: true, keywordTrackingSetting: { select: { countryCode: true, languageCode: true, locationName: true, device: true } } },
    });
    if (!project) throw new NotFoundException('Project not found.');
    return project;
  }

  async report(userId: string, projectId: string) {
    const project = await this.project(userId, projectId);
    const config = exactRankConfiguration();
    const stored = resolveKeywordTrackingSettings(project.keywordTrackingSetting as Partial<KeywordTrackingSettings> | null);
    const settings = { ...stored, device: config.provider === 'serper' ? 'desktop' as const : stored.device };
    const locationCode = trackingLocationCode(settings);
    const tracked = await prisma.trackedKeyword.findMany({
      where: { projectId, userId },
      select: {
        id: true, query: true, targetPage: true, createdAt: true,
        rankSnapshots: {
          where: { device: settings.device, locationCode },
          select: { provider: true, rankAbsolute: true, rankGroup: true, resultUrl: true, checkedAt: true, checkDate: true, device: true, locationCode: true },
          orderBy: { checkedAt: 'desc' }, take: 30,
        },
        serpTasks: {
          where: { device: settings.device, locationCode },
          select: { status: true, errorMessage: true, requestedAt: true }, orderBy: { requestedAt: 'desc' }, take: 1,
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const keywords = tracked.map((item) => {
      const [latest, previous] = item.rankSnapshots;
      const change = latest?.rankAbsolute !== null && latest?.rankAbsolute !== undefined && previous?.rankAbsolute !== null && previous?.rankAbsolute !== undefined
        ? latest.rankAbsolute - previous.rankAbsolute : null;
      const exact = latest ? {
        rank: latest.rankAbsolute, groupRank: latest.rankGroup, provider: latest.provider, change,
        resultUrl: latest.resultUrl, checkedAt: latest.checkedAt.toISOString(), device: latest.device, locationCode: latest.locationCode,
      } : null;
      const exactStatus = config.provider === 'dataforseo' ? item.serpTasks[0]?.status ?? null : latest?.provider === 'serper' ? 'COMPLETED' : null;
      return {
        id: item.id, query: item.query, targetPage: item.targetPage, createdAt: item.createdAt.toISOString(), exact,
        exactHistory: [...item.rankSnapshots].reverse().map((snapshot) => ({ date: formatDate(snapshot.checkDate), rank: snapshot.rankAbsolute })),
        exactStatus,
        exactError: config.provider === 'dataforseo' ? item.serpTasks[0]?.errorMessage ?? null : null,
        action: buildKeywordAction({ rank: latest?.rankAbsolute ?? null, change, targetPage: item.targetPage, resultUrl: latest?.resultUrl ?? null, status: exactStatus }),
      };
    }).sort((a, b) => (a.exact?.rank ?? 999) - (b.exact?.rank ?? 999));
    const ranked = keywords.filter((item) => item.exact?.rank !== null && item.exact?.rank !== undefined);
    const providerName = config.provider === 'dataforseo' ? 'DataForSEO' : 'Serper';
    return {
      settings,
      capabilities: { mobile: config.provider === 'dataforseo' },
      summary: {
        tracked: keywords.length,
        checked: keywords.filter((item) => item.exact || item.exactStatus === 'COMPLETED').length,
        top10: ranked.filter((item) => (item.exact?.rank ?? 999) <= 10).length,
        averageRank: ranked.length ? ranked.reduce((sum, item) => sum + (item.exact?.rank ?? 0), 0) / ranked.length : null,
        improved: ranked.filter((item) => (item.exact?.change ?? 0) < 0).length,
        declined: ranked.filter((item) => (item.exact?.change ?? 0) > 0).length,
      },
      exactRankNote: `رتبه ${settings.device === 'mobile' ? 'موبایل' : 'دسکتاپ'} با ${providerName} برای ${settings.locationName} از نتایج واقعی گوگل خوانده می‌شود.`,
      exactRankReady: config.configured,
      keywords,
    };
  }

  async updateSettings(userId: string, projectId: string, input: KeywordTrackingSettings) {
    await this.project(userId, projectId);
    const settings = resolveKeywordTrackingSettings(input);
    if (!/^[a-z]{2}$/.test(settings.countryCode)) throw new BadRequestException('Country code must contain two letters.');
    if (!/^[a-z]{2}$/.test(settings.languageCode)) throw new BadRequestException('Language code must contain two letters.');
    if (!settings.locationName || settings.locationName.length > 120) throw new BadRequestException('Location name is required and must be at most 120 characters.');
    if (exactRankConfiguration().provider === 'serper' && settings.device === 'mobile') throw new BadRequestException('Serper supports desktop tracking in this application. Choose desktop or switch to DataForSEO.');
    await prisma.keywordTrackingSetting.upsert({ where: { projectId }, create: { projectId, ...settings }, update: settings });
    return { settings, locationCode: trackingLocationCode(settings) };
  }

  async add(userId: string, projectId: string, query: string, targetPage?: string) {
    await this.project(userId, projectId);
    const normalized = query.trim().replace(/\s+/g, ' ');
    if (!normalized) throw new BadRequestException('Keyword is required.');
    const normalizedTarget = this.validateTargetPage(targetPage);
    const existing = await prisma.trackedKeyword.findUnique({ where: { projectId_userId_query: { projectId, userId, query: normalized } }, select: { id: true } });
    if (!existing) {
      const count = await prisma.trackedKeyword.count({ where: { projectId, userId } });
      if (count >= 100) throw new BadRequestException('A project can track up to 100 keywords.');
    }
    return prisma.trackedKeyword.upsert({ where: { projectId_userId_query: { projectId, userId, query: normalized } }, create: { projectId, userId, query: normalized, targetPage: normalizedTarget }, update: { targetPage: normalizedTarget } });
  }

  async bulkAdd(userId: string, projectId: string, items: Array<{ query: string; targetPage?: string }>) {
    await this.project(userId, projectId);
    const unique = new Map<string, { query: string; targetPage: string | null }>();
    for (const item of items) {
      const query = item.query.trim().replace(/\s+/g, ' ');
      if (!query) continue;
      unique.set(query.toLocaleLowerCase('fa'), { query, targetPage: this.validateTargetPage(item.targetPage) });
    }
    const keywords = [...unique.values()];
    if (!keywords.length) throw new BadRequestException('The import does not contain a keyword.');
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
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol');
      return url.toString();
    } catch { throw new BadRequestException('Target pages must be absolute HTTP or HTTPS URLs.'); }
  }
}
