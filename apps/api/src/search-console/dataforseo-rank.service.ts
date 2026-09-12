import { BadGatewayException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { prisma } from '@seo-machine/db';

type DfsResult = { id?: string; items?: DfsItem[] };
type DfsTask = { id?: string; status_code?: number; status_message?: string; cost?: number; result?: DfsResult[] };
type DfsItem = { type?: string; rank_absolute?: number; rank_group?: number; url?: string; domain?: string };
type DfsResponse = { status_code?: number; status_message?: string; tasks?: DfsTask[] };

function utcDate(value = new Date()) { return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())); }
function domainOf(value: string) { try { return new URL(value.includes('://') ? value : `https://${value}`).hostname.toLowerCase().replace(/^www\./, ''); } catch { return value.toLowerCase().replace(/^www\./, '').split('/')[0]; } }
function batches<T>(items: T[], size: number) { const result: T[][] = []; for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size)); return result; }

export function findDomainRank(items: DfsItem[], targetDomain: string) {
  const domain = domainOf(targetDomain);
  const eligible = items.filter((item) => ['organic', 'featured_snippet'].includes(item.type ?? ''));
  const match = eligible.find((item) => domainOf(item.domain ?? item.url ?? '') === domain);
  return { rankAbsolute: match?.rank_absolute ?? null, rankGroup: match?.rank_group ?? null, resultUrl: match?.url ?? null, serpFeatures: [...new Set(items.map((item) => item.type).filter((type): type is string => Boolean(type)))] };
}

@Injectable()
export class DataForSeoRankService {
  private config() {
    const login = process.env.DATAFORSEO_LOGIN?.trim();
    const password = process.env.DATAFORSEO_PASSWORD?.trim();
    const locationCode = Number(process.env.DATAFORSEO_LOCATION_CODE);
    const languageCode = process.env.DATAFORSEO_LANGUAGE_CODE?.trim() || 'fa';
    const depth = Math.min(Math.max(Number(process.env.DATAFORSEO_DEPTH ?? 100), 10), 100);
    if (!login || !password || !Number.isInteger(locationCode) || locationCode <= 0) throw new ServiceUnavailableException('DataForSEO is not configured.');
    return { login, password, locationCode, languageCode, depth };
  }

  private async request(path: string, init?: RequestInit) {
    const { login, password } = this.config();
    const response = await fetch(`https://api.dataforseo.com${path}`, { ...init, signal: AbortSignal.timeout(30_000), headers: { authorization: `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`, 'content-type': 'application/json', ...(init?.headers ?? {}) } });
    const text = await response.text();
    let payload: DfsResponse;
    try { payload = JSON.parse(text) as DfsResponse; } catch { throw new BadGatewayException('DataForSEO returned an invalid response.'); }
    if (!response.ok || (payload.status_code && payload.status_code !== 20000)) throw new BadGatewayException(payload.status_message ?? 'DataForSEO request failed.');
    return payload;
  }

  private async scope(userId: string, projectId: string) {
    const project = await prisma.project.findFirst({ where: { id: projectId, workspace: { organization: { memberships: { some: { userId } } } } }, select: { id: true, domain: true } });
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

  async enqueue(userId: string, projectId: string) {
    const project = await this.scope(userId, projectId);
    const config = this.config();
    const checkDate = utcDate();
    await this.collect(userId, projectId);
    const tracked = await prisma.trackedKeyword.findMany({ where: { projectId, userId, serpTasks: { none: { checkDate, device: 'desktop', locationCode: config.locationCode } } }, select: { id: true, query: true } });
    let queued = 0;
    for (const group of batches(tracked, 100)) {
      const payload = await this.request('/v3/serp/google/organic/task_post', { method: 'POST', body: JSON.stringify(group.map((item) => ({ keyword: item.query, location_code: config.locationCode, language_code: config.languageCode, device: 'desktop', depth: config.depth, stop_crawl_on_match: [{ match_value: domainOf(project.domain), match_type: 'with_subdomains' }], find_targets_in: ['organic', 'featured_snippet'], tag: item.id }))) });
      for (let index = 0; index < group.length; index++) {
        const task = payload.tasks?.[index];
        if (!task?.id || (task.status_code && task.status_code !== 20100)) continue;
        await prisma.keywordSerpTask.create({ data: { trackedKeywordId: group[index].id, externalTaskId: task.id, checkDate, device: 'desktop', locationCode: config.locationCode, costUsd: task.cost ?? 0 } });
        queued++;
      }
    }
    return { queued, skipped: tracked.length - queued, checkDate: checkDate.toISOString().slice(0, 10), provider: 'dataforseo' };
  }
}
