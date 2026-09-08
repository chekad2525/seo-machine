import { buildSearchConsoleInsights } from './search-console-insights';

describe('Search Console insights', () => {
  it('aggregates dimensions and identifies evidence-backed opportunities', () => {
    const result = buildSearchConsoleInsights([
      { query: 'seo tool', clicks: 1, impressions: 100, position: 7 },
      { query: 'seo tool', clicks: 0, impressions: 50, position: 9 },
      { query: 'brand', clicks: 20, impressions: 40, position: 1 },
    ], [{ page: 'https://example.com/a', clicks: 21, impressions: 190, position: 4 }]);

    expect(result.counts).toEqual({ queries: 2, pages: 1 });
    expect(result.opportunities.lowCtr[0]).toMatchObject({ label: 'seo tool', clicks: 1, impressions: 150 });
    expect(result.opportunities.strikingDistance[0].position).toBeCloseTo(7.67, 1);
    expect(result.recommendations.map((item) => item.id)).toEqual(expect.arrayContaining(['improve-serp-ctr', 'striking-distance', 'protect-winners']));
  });

  it('does not invent recommendations without data', () => {
    expect(buildSearchConsoleInsights([], []).recommendations).toEqual([]);
  });
});
