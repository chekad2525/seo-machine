import { aggregateAnalytics, percentChange } from './search-console-analytics';

describe('Search Console analytics', () => {
  it('builds chronological daily totals with weighted CTR and position', () => {
    const result = aggregateAnalytics([
      { date: new Date('2026-08-02T00:00:00Z'), clicks: 5, impressions: 50, position: 2 },
      { date: new Date('2026-08-01T00:00:00Z'), clicks: 10, impressions: 100, position: 4 },
      { date: new Date('2026-08-01T00:00:00Z'), clicks: 5, impressions: 50, position: 10 },
    ]);

    expect(result.totals).toEqual({ clicks: 20, impressions: 200, ctr: 0.1, position: 5 });
    expect(result.daily).toHaveLength(2);
    expect(result.daily[0]).toEqual({ date: '2026-08-01', clicks: 15, impressions: 150, ctr: 0.1, position: 6 });
  });

  it('handles empty periods and comparison baselines safely', () => {
    expect(aggregateAnalytics([])).toEqual({ totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 }, daily: [] });
    expect(percentChange(20, 10)).toBe(100);
    expect(percentChange(0, 0)).toBe(0);
    expect(percentChange(10, 0)).toBeNull();
  });
});

