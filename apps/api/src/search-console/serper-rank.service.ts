import { BadGatewayException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { prisma } from '@seo-machine/db';
import { resolveKeywordTrackingSettings, trackingLocationCode, type KeywordTrackingSettings } from '../keyword-tracking/keyword-tracking-settings';

type SerperOrganicResult = { link?: string; position?: number };
type SerperResponse = {
  organic?: SerperOrganicResult[];
  searchParameters?: Record<string, unknown>;
  message?: string;
  [key: string]: unknown;
};

function utcDate(value = new Date()) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function domainOf(value: string) {
  try {
    return new URL(value.includes('://') ? value : `https://${value}`).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return value.toLowerCase().replace(/^www\./, '').split('/')[0];
  }
}

function batches<T>(items: T[], size: number) {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) output.push(items.slice(index, index + size));
  return output;
}

export function findSerperRank(items: SerperOrganicResult[], targetDomain: string) {
  const domain = domainOf(targetDomain);
  const match = items.find((item) => item.link && domainOf(item.link) === domain);
  return {
    rankAbsolute: Number.isInteger(match?.position) ? match!.position! : null,
    rankGroup: Number.isInteger(match?.position) ? match!.position! : null,
    resultUrl: match?.link ?? null,
  };
}

@Injectable()
export class SerperRankService {
  private config() {
    const apiKey = process.env.SERPER_API_KEY?.trim();
    const resultCount = Math.min(Math.max(Number(process.env.SERPER_RESULT_COUNT ?? 100), 10), 100);
    const maxKeywords = Math.min(Math.max(Number(process.env.SERPER_MAX_KEYWORDS_PER_RUN ?? 100), 1), 100);
    if (!apiKey) throw new ServiceUnavailableException('Serper is not configured. Add SERPER_API_KEY to the API environment variables.');
    if (!Number.isInteger(resultCount) || !Number.isInteger(maxKeywords)) throw new ServiceUnavailableException('Serper numeric settings are invalid.');
    return { apiKey, resultCount, maxKeywords };
  }

  private async scope(userId: string, projectId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, workspace: { organization: { memberships: { some: { userId } } } } },
      select: { id: true, domain: true, keywordTrackingSetting: { select: { countryCode: true, languageCode: true, locationName: true, device: true } } },
    });
    if (!project) throw new NotFoundException('Project not found.');
    return project;
  }

  private async search(keyword: string, config: ReturnType<SerperRankService['config']>, settings: ReturnType<typeof resolveKeywordTrackingSettings>) {
    const body: Record<string, string | number> = {
      q: keyword,
      gl: settings.countryCode,
      hl: settings.languageCode,
      num: config.resultCount,
    };
    if (settings.locationName) body.location = settings.locationName;
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      signal: AbortSignal.timeout(30_000),
      headers: { 'X-API-KEY': config.apiKey, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let payload: SerperResponse;
    try {
      payload = JSON.parse(text) as SerperResponse;
    } catch {
      throw new BadGatewayException('Serper returned an invalid response.');
    }
    if (!response.ok) throw new BadGatewayException(payload.message || `Serper returned HTTP ${response.status}.`);
    if (!Array.isArray(payload.organic)) throw new BadGatewayException('Serper response does not contain organic results.');
    return payload;
  }

  async check(userId: string, projectId: string) {
    const project = await this.scope(userId, projectId);
    const config = this.config();
    const settings = { ...resolveKeywordTrackingSettings(project.keywordTrackingSetting as Partial<KeywordTrackingSettings> | null), device: 'desktop' as const };
    const locationCode = trackingLocationCode(settings);
    const checkDate = utcDate();
    const completedToday = await prisma.keywordRankSnapshot.findMany({
      where: {
        provider: 'serper', checkDate, device: settings.device, locationCode,
        trackedKeyword: { projectId, userId },
      },
      select: { trackedKeywordId: true },
    });
    const completedIds = completedToday.map((item) => item.trackedKeywordId);
    const dueKeywords = await prisma.trackedKeyword.findMany({
      where: { projectId, userId, ...(completedIds.length ? { id: { notIn: completedIds } } : {}) },
      select: { id: true, query: true },
      orderBy: { createdAt: 'asc' },
    });
    const tracked = dueKeywords.slice(0, config.maxKeywords);
    if (!tracked.length) return { checked: 0, failed: 0, skipped: completedIds.length, provider: 'serper', message: 'Today\'s exact ranks are already available.' };

    let checked = 0;
    let failed = 0;
    let lastError = '';
    for (const group of batches(tracked, 5)) {
      await Promise.all(group.map(async (keyword) => {
        try {
          const payload = await this.search(keyword.query, config, settings);
          const rank = findSerperRank(payload.organic ?? [], project.domain);
          const serpFeatures = Object.keys(payload).filter((key) => !['searchParameters', 'credits'].includes(key));
          await prisma.keywordRankSnapshot.upsert({
            where: {
              trackedKeywordId_checkDate_device_locationCode: {
                trackedKeywordId: keyword.id, checkDate, device: settings.device, locationCode,
              },
            },
            create: {
              trackedKeywordId: keyword.id, checkDate, provider: 'serper', device: settings.device,
              locationCode, serpFeatures, ...rank,
            },
            update: { provider: 'serper', serpFeatures, checkedAt: new Date(), ...rank },
          });
          checked++;
        } catch (error) {
          failed++;
          lastError = error instanceof Error ? error.message : 'Serper request failed.';
        }
      }));
    }
    if (!checked && failed) throw new BadGatewayException(lastError);
    return {
      checked,
      failed,
      skipped: completedIds.length,
      remaining: Math.max(0, dueKeywords.length - tracked.length),
      provider: 'serper',
      checkDate: checkDate.toISOString().slice(0, 10),
    };
  }
}
