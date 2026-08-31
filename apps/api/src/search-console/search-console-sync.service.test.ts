import { defaultSyncRange, formatDate, normalizeMetricRow } from './search-console-sync.service';

describe('Search Console ingestion helpers', () => {
  it('defaults to the latest complete 28-day window', () => {
    const range = defaultSyncRange(new Date('2026-08-31T12:00:00.000Z'));
    expect(formatDate(range.startDate)).toBe('2026-08-02');
    expect(formatDate(range.endDate)).toBe('2026-08-29');
  });

  it('normalizes date/dimension rows and drops malformed rows', () => {
    expect(normalizeMetricRow({ keys: ['2026-08-29', 'seo machine'], clicks: 8.6, impressions: 20.2, ctr: .43, position: 3.2 }, 'query')).toEqual({ date: new Date('2026-08-29T00:00:00.000Z'), query: 'seo machine', clicks: 9, impressions: 20, ctr: .43, position: 3.2 });
    expect(normalizeMetricRow({ keys: ['not-a-date', 'page'] }, 'page')).toBeNull();
  });
});
