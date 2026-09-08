import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { prisma } from '@seo-machine/db';
import { randomUUID } from 'crypto';
import { SearchConsoleTokenService } from './search-console-token.service';
import { aggregateAnalytics, percentChange } from './search-console-analytics';
import { buildSearchConsoleInsights } from './search-console-insights';

const SEARCH_ANALYTICS_LIMIT = 25_000;
const MAX_SYNC_DAYS = 31;
const SEARCH_ANALYTICS_ENDPOINT = 'https://www.googleapis.com/webmasters/v3/sites';

type MetricRow = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number };
type SearchAnalyticsResponse = { rows?: MetricRow[]; responseAggregationType?: string };
type DateRange = { startDate: Date; endDate: Date };
type MetricValues = { date: Date; clicks: number; impressions: number; ctr: number; position: number };
type QueryMetricRow = MetricValues & { query: string };
type PageMetricRow = MetricValues & { page: string };

export function formatDate(date: Date) { return date.toISOString().slice(0, 10); }

export function defaultSyncRange(now = new Date()): DateRange {
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 2));
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - 27);
  return { startDate, endDate };
}

export function normalizeMetricRow(row: MetricRow, dimension: 'query' | 'page'): QueryMetricRow | PageMetricRow | null {
  const key = row.keys?.[1]?.trim();
  const date = row.keys?.[0];
  if (!key || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(parsedDate.getTime()) || formatDate(parsedDate) !== date) return null;
  if ([row.clicks, row.impressions, row.ctr, row.position].some((value) => value !== undefined && (!Number.isFinite(value) || value < 0))) return null;
  if ((row.ctr ?? 0) > 1) return null;
  const values = { date: parsedDate, clicks: Math.round(row.clicks ?? 0), impressions: Math.round(row.impressions ?? 0), ctr: row.ctr ?? 0, position: row.position ?? 0 };
  return dimension === 'query' ? { ...values, query: key } : { ...values, page: key };
}

@Injectable()
export class SearchConsoleSyncService {
  constructor(private readonly tokens: SearchConsoleTokenService) {}

  async sync(userId: string, projectId: string, requestedRange?: Partial<DateRange>, connectionId?: string, scheduled = false) {
    const scope = { projectId, userId, status: 'CONNECTED' as const, project: { workspace: { organization: { memberships: { some: { userId } } } } } };
    const connection = await prisma.searchConsoleConnection.findFirst({ where: { ...scope, ...(connectionId ? { id: connectionId } : {}) }, orderBy: { createdAt: 'asc' } });
    if (!connection) throw new NotFoundException('A connected Search Console property was not found.');
    const range = this.validRange(requestedRange);
    const leaseId = randomUUID();
    const run = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const claimed = await tx.searchConsoleConnection.updateMany({
        where: { ...scope, id: connection.id, ...(scheduled ? { nextSyncAt: { lte: now } } : {}), OR: [{ syncLeaseUntil: null }, { syncLeaseUntil: { lte: now } }] },
        data: { syncLeaseId: leaseId, syncLeaseUntil: new Date(now.getTime() + 10 * 60_000) },
      });
      if (claimed.count !== 1) throw new ConflictException('A sync is already running or is no longer due.');
      await tx.searchConsoleSyncRun.updateMany({ where: { connectionId: connection.id, status: 'RUNNING' }, data: { status: 'FAILED', errorMessage: 'Previous worker lease expired.', completedAt: now } });
      return tx.searchConsoleSyncRun.create({ data: { connectionId: connection.id, rangeStart: range.startDate, rangeEnd: range.endDate } });
    });
    try {
      // Sequential requests avoid competing refreshes; the lease fences all writes.
      const queryRows = await this.fetchRows(connection.id, connection.property, leaseId, range, 'query');
      const pageRows = await this.fetchRows(connection.id, connection.property, leaseId, range, 'page');
      await prisma.$transaction(async (tx) => {
        const owned = await tx.searchConsoleConnection.updateMany({ where: { ...scope, id: connection.id, syncLeaseId: leaseId, syncLeaseUntil: { gt: new Date() } }, data: { syncLeaseId: null, syncLeaseUntil: null, nextSyncAt: new Date(Date.now() + 24 * 60 * 60_000) } });
        if (owned.count !== 1) throw new ConflictException('Search Console sync ownership changed.');
        const window = { connectionId: connection.id, date: { gte: range.startDate, lte: range.endDate } };
        await tx.searchConsoleQueryMetric.deleteMany({ where: window });
        await tx.searchConsolePageMetric.deleteMany({ where: window });
        for (let offset = 0; offset < queryRows.length; offset += 1000) await tx.searchConsoleQueryMetric.createMany({ data: queryRows.slice(offset, offset + 1000).map((row) => ({ connectionId: connection.id, ...row })) });
        for (let offset = 0; offset < pageRows.length; offset += 1000) await tx.searchConsolePageMetric.createMany({ data: pageRows.slice(offset, offset + 1000).map((row) => ({ connectionId: connection.id, ...row })) });
        await tx.searchConsoleSyncRun.update({ where: { id: run.id }, data: { status: 'COMPLETED', rowsUpserted: queryRows.length + pageRows.length, completedAt: new Date() } });
      }, { timeout: 120_000 });
      return { id: run.id, status: 'COMPLETED', rangeStart: formatDate(range.startDate), rangeEnd: formatDate(range.endDate), queryRows: queryRows.length, pageRows: pageRows.length };
    } catch (error) {
      await prisma.$transaction(async (tx) => {
        await tx.searchConsoleConnection.updateMany({ where: { id: connection.id, syncLeaseId: leaseId }, data: { syncLeaseId: null, syncLeaseUntil: null, nextSyncAt: new Date(Date.now() + 15 * 60_000) } });
        await tx.searchConsoleSyncRun.updateMany({ where: { id: run.id, status: 'RUNNING' }, data: { status: 'FAILED', errorMessage: error instanceof BadRequestException || error instanceof ServiceUnavailableException || error instanceof ConflictException ? error.message : 'Search Console sync failed.', completedAt: new Date() } });
      });
      if (error instanceof ServiceUnavailableException || error instanceof BadRequestException || error instanceof ConflictException) throw error;
      throw new ServiceUnavailableException('Search Console data could not be synced.');
    }
  }

  async metrics(userId: string, projectId: string, dimension: 'query' | 'page', limit = 100, requestedRange?: Partial<DateRange>) {
    const connection = await prisma.searchConsoleConnection.findFirst({ where: { projectId, userId, project: { workspace: { organization: { memberships: { some: { userId } } } } } }, select: { id: true } });
    if (!connection) throw new NotFoundException('Project or Search Console connection not found.');
    const range = this.validRange(requestedRange);
    const take = Math.min(Math.max(limit, 1), 1000);
    const where = { connectionId: connection.id, date: { gte: range.startDate, lte: range.endDate } };
    return dimension === 'query'
      ? prisma.searchConsoleQueryMetric.findMany({ where, orderBy: [{ date: 'desc' }, { clicks: 'desc' }], take })
      : prisma.searchConsolePageMetric.findMany({ where, orderBy: [{ date: 'desc' }, { clicks: 'desc' }], take });
  }

  async latestRun(userId: string, projectId: string) {
    const connection = await prisma.searchConsoleConnection.findFirst({ where: { projectId, userId, project: { workspace: { organization: { memberships: { some: { userId } } } } } }, select: { id: true } });
    if (!connection) throw new NotFoundException('Project or Search Console connection not found.');
    return prisma.searchConsoleSyncRun.findFirst({ where: { connectionId: connection.id }, orderBy: { startedAt: 'desc' } });
  }

  async summary(userId: string, projectId: string, requestedRange?: Partial<DateRange>) {
    const connection = await prisma.searchConsoleConnection.findFirst({
      where: { projectId, userId, project: { workspace: { organization: { memberships: { some: { userId } } } } } },
      select: { id: true },
    });
    if (!connection) throw new NotFoundException('Project or Search Console connection not found.');

    const range = this.validRange(requestedRange);
    const dayCount = Math.round((range.endDate.getTime() - range.startDate.getTime()) / 86_400_000) + 1;
    const previousEnd = new Date(range.startDate);
    previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setUTCDate(previousStart.getUTCDate() - dayCount + 1);
    const select = { date: true, clicks: true, impressions: true, position: true } as const;
    const [currentRows, previousRows] = await Promise.all([
      prisma.searchConsolePageMetric.findMany({ where: { connectionId: connection.id, date: { gte: range.startDate, lte: range.endDate } }, select }),
      prisma.searchConsolePageMetric.findMany({ where: { connectionId: connection.id, date: { gte: previousStart, lte: previousEnd } }, select }),
    ]);
    const current = aggregateAnalytics(currentRows);
    const previous = aggregateAnalytics(previousRows);

    return {
      range: { startDate: formatDate(range.startDate), endDate: formatDate(range.endDate) },
      totals: current.totals,
      comparison: {
        clicksPercent: percentChange(current.totals.clicks, previous.totals.clicks),
        impressionsPercent: percentChange(current.totals.impressions, previous.totals.impressions),
        ctrPercent: percentChange(current.totals.ctr, previous.totals.ctr),
        positionDelta: previous.totals.impressions > 0 ? current.totals.position - previous.totals.position : null,
      },
      daily: current.daily,
    };
  }

  async insights(userId: string, projectId: string, requestedRange?: Partial<DateRange>) {
    const connection = await prisma.searchConsoleConnection.findFirst({
      where: { projectId, userId, project: { workspace: { organization: { memberships: { some: { userId } } } } } },
      select: { id: true },
    });
    if (!connection) throw new NotFoundException('Project or Search Console connection not found.');
    const range = this.validRange(requestedRange);
    const where = { connectionId: connection.id, date: { gte: range.startDate, lte: range.endDate } };
    const [queryRows, pageRows] = await Promise.all([
      prisma.searchConsoleQueryMetric.findMany({ where, select: { query: true, clicks: true, impressions: true, position: true } }),
      prisma.searchConsolePageMetric.findMany({ where, select: { page: true, clicks: true, impressions: true, position: true } }),
    ]);
    return {
      range: { startDate: formatDate(range.startDate), endDate: formatDate(range.endDate) },
      ...buildSearchConsoleInsights(queryRows, pageRows),
    };
  }

  private async fetchRows(connectionId: string, property: string, leaseId: string, range: DateRange, dimension: 'query'): Promise<QueryMetricRow[]>;
  private async fetchRows(connectionId: string, property: string, leaseId: string, range: DateRange, dimension: 'page'): Promise<PageMetricRow[]>;
  private async fetchRows(connectionId: string, property: string, leaseId: string, range: DateRange, dimension: 'query' | 'page') {
    const rows: Array<QueryMetricRow | PageMetricRow> = [];
    for (let startRow = 0; startRow < 100_000; startRow += SEARCH_ANALYTICS_LIMIT) {
      let token = await this.tokens.accessToken(connectionId, leaseId);
      const request = () => fetch(`${SEARCH_ANALYTICS_ENDPOINT}/${encodeURIComponent(property)}/searchAnalytics/query`, { method: 'POST', signal: AbortSignal.timeout(30_000), headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ startDate: formatDate(range.startDate), endDate: formatDate(range.endDate), dataState: 'final', dimensions: ['date', dimension], rowLimit: SEARCH_ANALYTICS_LIMIT, startRow }) });
      let response = await request();
      if (response.status === 401) { token = await this.tokens.accessToken(connectionId, leaseId, true); response = await request(); }
      if (response.status === 401) throw new BadRequestException('Search Console authorization expired. Reconnect the property.');
      if (!response.ok) throw new ServiceUnavailableException('Search Console did not return metric data.');
      const payload = await response.json() as SearchAnalyticsResponse;
      if (!payload || (payload.rows !== undefined && !Array.isArray(payload.rows))) throw new ServiceUnavailableException('Google returned invalid metric data.');
      const batch: Array<QueryMetricRow | PageMetricRow> = [];
      for (const row of payload.rows ?? []) {
        const normalized = dimension === 'query' ? normalizeMetricRow(row, 'query') : normalizeMetricRow(row, 'page');
        if (!normalized || normalized.date < range.startDate || normalized.date > range.endDate) throw new ServiceUnavailableException('Google returned invalid metric data.');
        batch.push(normalized);
      }
      rows.push(...batch);
      if ((payload.rows ?? []).length < SEARCH_ANALYTICS_LIMIT) return rows;
    }
    throw new BadRequestException('Search Console row safety limit reached. Sync a smaller date range.');
  }

  private validRange(requested?: Partial<DateRange>) {
    const fallback = defaultSyncRange();
    const startDate = new Date(requested?.startDate ?? fallback.startDate);
    const endDate = new Date(requested?.endDate ?? fallback.endDate);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(0, 0, 0, 0);
    const dayCount = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
    if (Number.isNaN(dayCount) || dayCount < 1 || dayCount > MAX_SYNC_DAYS) throw new BadRequestException(`Sync range must be between 1 and ${MAX_SYNC_DAYS} days.`);
    return { startDate, endDate };
  }
}
