import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { prisma } from '@seo-machine/db';
import { decryptToken } from './search-console.service';

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
  const values = { date: new Date(`${date}T00:00:00.000Z`), clicks: Math.max(0, Math.round(row.clicks ?? 0)), impressions: Math.max(0, Math.round(row.impressions ?? 0)), ctr: Math.max(0, row.ctr ?? 0), position: Math.max(0, row.position ?? 0) };
  return dimension === 'query' ? { ...values, query: key } : { ...values, page: key };
}

@Injectable()
export class SearchConsoleSyncService {
  async sync(userId: string, projectId: string, requestedRange?: Partial<DateRange>) {
    const connection = await prisma.searchConsoleConnection.findFirst({ where: { projectId, userId, status: 'CONNECTED', project: { workspace: { organization: { memberships: { some: { userId } } } } } } });
    if (!connection) throw new NotFoundException('A connected Search Console property was not found.');
    if (!connection.accessTokenEnc) throw new BadRequestException('Reconnect Search Console before syncing data.');
    const range = this.validRange(requestedRange);
    const activeRun = await prisma.searchConsoleSyncRun.findFirst({ where: { connectionId: connection.id, status: 'RUNNING', startedAt: { gt: new Date(Date.now() - 15 * 60 * 1000) } } });
    if (activeRun) throw new ConflictException('A Search Console sync is already running.');
    const run = await prisma.searchConsoleSyncRun.create({ data: { connectionId: connection.id, rangeStart: range.startDate, rangeEnd: range.endDate } });
    try {
      const token = decryptToken(connection.accessTokenEnc);
      const [queryRows, pageRows] = await Promise.all([this.fetchRows(connection.property, token, range, 'query'), this.fetchRows(connection.property, token, range, 'page')]);
      await prisma.$transaction(async (tx) => {
        for (const row of queryRows) await tx.searchConsoleQueryMetric.upsert({ where: { connectionId_date_query: { connectionId: connection.id, date: row.date, query: row.query } }, create: { connectionId: connection.id, ...row }, update: { clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position } });
        for (const row of pageRows) await tx.searchConsolePageMetric.upsert({ where: { connectionId_date_page: { connectionId: connection.id, date: row.date, page: row.page } }, create: { connectionId: connection.id, ...row }, update: { clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position } });
        await tx.searchConsoleSyncRun.update({ where: { id: run.id }, data: { status: 'COMPLETED', rowsUpserted: queryRows.length + pageRows.length, completedAt: new Date() } });
      });
      return { id: run.id, status: 'COMPLETED', rangeStart: formatDate(range.startDate), rangeEnd: formatDate(range.endDate), queryRows: queryRows.length, pageRows: pageRows.length };
    } catch (error) {
      await prisma.searchConsoleSyncRun.update({ where: { id: run.id }, data: { status: 'FAILED', errorMessage: error instanceof Error ? error.message.slice(0, 1000) : 'Unknown sync error', completedAt: new Date() } });
      if (error instanceof ServiceUnavailableException || error instanceof BadRequestException) throw error;
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

  private async fetchRows(property: string, token: string, range: DateRange, dimension: 'query'): Promise<QueryMetricRow[]>;
  private async fetchRows(property: string, token: string, range: DateRange, dimension: 'page'): Promise<PageMetricRow[]>;
  private async fetchRows(property: string, token: string, range: DateRange, dimension: 'query' | 'page') {
    const rows: Array<QueryMetricRow | PageMetricRow> = [];
    for (let startRow = 0; startRow < 100_000; startRow += SEARCH_ANALYTICS_LIMIT) {
      const response = await fetch(`${SEARCH_ANALYTICS_ENDPOINT}/${encodeURIComponent(property)}/searchAnalytics/query`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ startDate: formatDate(range.startDate), endDate: formatDate(range.endDate), dimensions: ['date', dimension], rowLimit: SEARCH_ANALYTICS_LIMIT, startRow }) });
      if (response.status === 401) throw new BadRequestException('Search Console authorization expired. Reconnect the property.');
      if (!response.ok) throw new ServiceUnavailableException('Search Console did not return metric data.');
      const payload = await response.json() as SearchAnalyticsResponse;
      const batch: Array<QueryMetricRow | PageMetricRow> = [];
      for (const row of payload.rows ?? []) {
        const normalized = dimension === 'query' ? normalizeMetricRow(row, 'query') : normalizeMetricRow(row, 'page');
        if (normalized) batch.push(normalized);
      }
      rows.push(...batch);
      if ((payload.rows ?? []).length < SEARCH_ANALYTICS_LIMIT) break;
    }
    return rows;
  }

  private validRange(requested?: Partial<DateRange>) {
    const fallback = defaultSyncRange();
    const startDate = requested?.startDate ?? fallback.startDate;
    const endDate = requested?.endDate ?? fallback.endDate;
    const dayCount = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
    if (Number.isNaN(dayCount) || dayCount < 1 || dayCount > MAX_SYNC_DAYS) throw new BadRequestException(`Sync range must be between 1 and ${MAX_SYNC_DAYS} days.`);
    return { startDate, endDate };
  }
}
