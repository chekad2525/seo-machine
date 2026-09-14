import { BadGatewayException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { prisma } from '@seo-machine/db';
import { resolveKeywordTrackingSettings, trackingLocationCode, type KeywordTrackingSettings } from '../keyword-tracking/keyword-tracking-settings';

type DfsResult = { id?: string; items?: DfsItem[] };
type DfsLocation = { location_code?: number; location_name?: string; country_iso_code?: string; location_type?: string };
type DfsTask<T = DfsResult> = { id?: string; status_code?: number; status_message?: string; cost?: number; result?: T[] };
type DfsItem = { type?: string; rank_absolute?: number; rank_group?: number; url?: string; domain?: string };
type DfsResponse<T = DfsResult> = { status_code?: number; status_message?: string; tasks?: DfsTask<T>[] };
type DfsTaskLocation = { location_code: number } | { location_coordinate: string };

const IRAN_LOCATION_COORDINATES: Record<string, string> = {
  iran: '32.4279,53.6880,5z',
  'ایران': '32.4279,53.6880,5z',
  tehran: '35.6892,51.3890,12z',
  'تهران': '35.6892,51.3890,12z',
  mashhad: '36.2605,59.6168,12z',
  'مشهد': '36.2605,59.6168,12z',
  isfahan: '32.6546,51.6680,12z',
  esfahan: '32.6546,51.6680,12z',
  'اصفهان': '32.6546,51.6680,12z',
  shiraz: '29.5918,52.5837,12z',
  'شیراز': '29.5918,52.5837,12z',
  tabriz: '38.0962,46.2738,12z',
  'تبریز': '38.0962,46.2738,12z',
  karaj: '35.8400,50.9391,12z',
  'کرج': '35.8400,50.9391,12z',
  qom: '34.6416,50.8746,12z',
  'قم': '34.6416,50.8746,12z',
  ahvaz: '31.3183,48.6706,12z',
  'اهواز': '31.3183,48.6706,12z',
};

function utcDate(value = new Date()) { return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())); }
function domainOf(value: string) { try { return new URL(value.includes('://') ? value : `https://${value}`).hostname.toLowerCase().replace(/^www\./, ''); } catch { return value.toLowerCase().replace(/^www\./, '').split('/')[0]; } }
function isSameDomain(candidate: string, target: string) { const candidateDomain = domainOf(candidate); const targetDomain = domainOf(target); return candidateDomain === targetDomain || candidateDomain.endsWith(`.${targetDomain}`); }
function batches<T>(items: T[], size: number) { const result: T[][] = []; for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size)); return result; }
function normalizedLocation(value: string) { return value.normalize('NFKC').toLowerCase().split(',').map((part) => part.trim().replace(/\s+/g, ' ')).filter(Boolean); }

export function selectDataForSeoLocation(locations: DfsLocation[], requestedName: string, countryCode: string) {
  const country = countryCode.trim().toUpperCase();
  const eligible = locations.filter((location) => location.location_code && (!location.country_iso_code || location.country_iso_code.toUpperCase() === country));
  const requested = normalizedLocation(requestedName);
  const exact = eligible.find((location) => normalizedLocation(location.location_name ?? '').join(',') === requested.join(','));
  if (exact) return exact;
  const city = requested[0];
  const cityMatch = city ? eligible.find((location) => normalizedLocation(location.location_name ?? '')[0] === city) : undefined;
  if (cityMatch) return cityMatch;
  return eligible.find((location) => location.location_type?.toLowerCase() === 'country')
    ?? eligible.find((location) => normalizedLocation(location.location_name ?? '').length === 1)
    ?? null;
}

export function fallbackDataForSeoCoordinates(requestedName: string, countryCode: string) {
  if (countryCode.trim().toLowerCase() !== 'ir') return null;
  const requested = normalizedLocation(requestedName);
  return IRAN_LOCATION_COORDINATES[requested[0] ?? ''] ?? IRAN_LOCATION_COORDINATES.iran;
}

export function findDomainRank(items: DfsItem[], targetDomain: string) {
  const eligible = items.filter((item) => ['organic', 'featured_snippet'].includes(item.type ?? ''));
  const match = eligible.find((item) => isSameDomain(item.domain ?? item.url ?? '', targetDomain));
  return { rankAbsolute: match?.rank_absolute ?? null, rankGroup: match?.rank_group ?? null, resultUrl: match?.url ?? null, serpFeatures: [...new Set(items.map((item) => item.type).filter((type): type is string => Boolean(type)))] };
}

@Injectable()
export class DataForSeoRankService {
  private readonly locationCache = new Map<string, { expiresAt: number; locations: DfsLocation[] }>();

  private config() {
    const login = process.env.DATAFORSEO_LOGIN?.trim();
    const password = process.env.DATAFORSEO_PASSWORD?.trim();
    const depth = Math.min(Math.max(Number(process.env.DATAFORSEO_DEPTH ?? 100), 10), 100);
    if (!login || !password) throw new ServiceUnavailableException('DataForSEO is not configured.');
    return { login, password, depth };
  }

  private async request<T = DfsResult>(path: string, init?: RequestInit) {
    const { login, password } = this.config();
    const response = await fetch(`https://api.dataforseo.com${path}`, { ...init, signal: AbortSignal.timeout(30_000), headers: { authorization: `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`, 'content-type': 'application/json', ...(init?.headers ?? {}) } });
    const text = await response.text();
    let payload: DfsResponse<T>;
    try { payload = JSON.parse(text) as DfsResponse<T>; } catch { throw new BadGatewayException('DataForSEO returned an invalid response.'); }
    if (!response.ok || (payload.status_code && payload.status_code !== 20000)) throw new BadGatewayException(payload.status_message ?? 'DataForSEO request failed.');
    return payload;
  }

  private async resolveLocation(settings: KeywordTrackingSettings): Promise<DfsTaskLocation> {
    const countryCode = settings.countryCode.trim().toUpperCase();
    const cached = this.locationCache.get(countryCode);
    let locations = cached?.expiresAt && cached.expiresAt > Date.now() ? cached.locations : undefined;
    if (!locations) {
      const payload = await this.request<DfsLocation>(`/v3/serp/google/locations/${encodeURIComponent(countryCode.toLowerCase())}`);
      const task = payload.tasks?.[0];
      if (task?.status_code && task.status_code !== 20000) throw new BadGatewayException(task.status_message ?? 'DataForSEO location lookup failed.');
      locations = task?.result ?? [];
      this.locationCache.set(countryCode, { expiresAt: Date.now() + 24 * 60 * 60 * 1000, locations });
    }
    const location = selectDataForSeoLocation(locations, settings.locationName, countryCode);
    if (location?.location_code) return { location_code: location.location_code };
    const coordinate = fallbackDataForSeoCoordinates(settings.locationName, countryCode);
    if (coordinate) return { location_coordinate: coordinate };
    throw new BadGatewayException(`DataForSEO has no supported Google location for ${settings.locationName || countryCode}.`);
  }

  private async scope(userId: string, projectId: string) {
    const project = await prisma.project.findFirst({ where: { id: projectId, workspace: { organization: { memberships: { some: { userId } } } } }, select: { id: true, domain: true, keywordTrackingSetting: { select: { countryCode: true, languageCode: true, locationName: true, device: true } } } });
    if (!project) throw new NotFoundException('Project not found.');
    return project;
  }

  async collect(userId: string, projectId: string) {
    const project = await this.scope(userId, projectId);
    const pending = await prisma.keywordSerpTask.findMany({ where: { status: 'PENDING', trackedKeyword: { projectId, userId } }, select: { id: true, externalTaskId: true, trackedKeywordId: true, checkDate: true, device: true, locationCode: true } });
    if (!pending.length) return { collected: 0, pending: 0 };
    const readyPayload = await this.request('/v3/serp/google/organic/tasks_ready');
    const ready = new Set((readyPayload.tasks ?? []).flatMap((task) => task.result ?? []).map((item) => item.id).filter((id): id is string => Boolean(id)));
    let collected = 0;
    for (const task of pending.filter((item) => ready.has(item.externalTaskId)).slice(0, 50)) {
      try {
        const payload = await this.request(`/v3/serp/google/organic/task_get/advanced/${encodeURIComponent(task.externalTaskId)}`);
        const responseTask = payload.tasks?.[0];
        const items = responseTask?.result?.[0]?.items ?? [];
        const rank = findDomainRank(items, project.domain);
        await prisma.$transaction([
          prisma.keywordRankSnapshot.upsert({ where: { trackedKeywordId_checkDate_device_locationCode: { trackedKeywordId: task.trackedKeywordId, checkDate: task.checkDate, device: task.device, locationCode: task.locationCode } }, create: { trackedKeywordId: task.trackedKeywordId, checkDate: task.checkDate, device: task.device, locationCode: task.locationCode, costUsd: responseTask?.cost ?? 0, ...rank }, update: { costUsd: responseTask?.cost ?? 0, checkedAt: new Date(), ...rank } }),
          prisma.keywordSerpTask.update({ where: { id: task.id }, data: { status: 'COMPLETED', costUsd: responseTask?.cost ?? 0, completedAt: new Date() } }),
        ]);
        collected++;
      } catch (error) {
        await prisma.keywordSerpTask.update({ where: { id: task.id }, data: { status: 'FAILED', errorMessage: error instanceof Error ? error.message : 'Could not collect SERP result.', completedAt: new Date() } });
      }
    }
    const remaining = await prisma.keywordSerpTask.count({ where: { status: 'PENDING', trackedKeyword: { projectId, userId } } });
    return { collected, pending: remaining };
  }

  async enqueue(userId: string, projectId: string, force = false) {
    const project = await this.scope(userId, projectId);
    const config = this.config();
    const settings = resolveKeywordTrackingSettings(project.keywordTrackingSetting as Partial<KeywordTrackingSettings> | null);
    const locationCode = trackingLocationCode(settings);
    const checkDate = utcDate();
    await this.collect(userId, projectId);
    const tracked = await prisma.trackedKeyword.findMany({ where: { projectId, userId, ...(!force ? { serpTasks: { none: { checkDate, device: settings.device, locationCode } } } : {}) }, select: { id: true, query: true } });
    if (!tracked.length) return { queued: 0, skipped: 0, failed: 0, checkDate: checkDate.toISOString().slice(0, 10), provider: 'dataforseo' };
    const providerLocation = await this.resolveLocation(settings);
    let queued = 0;
    const failures: string[] = [];
    for (const group of batches(tracked, 100)) {
      const payload = await this.request('/v3/serp/google/organic/task_post', { method: 'POST', body: JSON.stringify(group.map((item) => ({ keyword: item.query, ...providerLocation, language_code: settings.languageCode, device: settings.device, depth: config.depth, stop_crawl_on_match: [{ match_value: domainOf(project.domain), match_type: 'with_subdomains' }], find_targets_in: ['organic', 'featured_snippet'], tag: item.id }))) });
      for (let index = 0; index < group.length; index++) {
        const task = payload.tasks?.[index];
        if (!task?.id || (task.status_code && task.status_code !== 20100)) {
          failures.push(task?.status_message ?? 'DataForSEO did not accept the rank task.');
          continue;
        }
        const data = { trackedKeywordId: group[index].id, externalTaskId: task.id, checkDate, device: settings.device, locationCode, costUsd: task.cost ?? 0 };
        if (force) {
          await prisma.keywordSerpTask.upsert({
            where: { trackedKeywordId_checkDate_device_locationCode: { trackedKeywordId: group[index].id, checkDate, device: settings.device, locationCode } },
            create: data,
            update: { externalTaskId: task.id, status: 'PENDING', costUsd: task.cost ?? 0, errorMessage: null, requestedAt: new Date(), completedAt: null },
          });
        } else {
          await prisma.keywordSerpTask.create({ data });
        }
        queued++;
      }
    }
    if (tracked.length && !queued && failures.length) throw new BadGatewayException(`DataForSEO rejected the rank request: ${failures[0]}`);
    return { queued, skipped: tracked.length - queued, failed: failures.length, checkDate: checkDate.toISOString().slice(0, 10), provider: 'dataforseo' };
  }
}
