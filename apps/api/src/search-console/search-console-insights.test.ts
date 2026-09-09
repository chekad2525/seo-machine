import { buildSearchConsoleInsights } from './search-console-insights';

describe('Search Console insights', () => {
  it('aggregates dimensions and identifies evidence-backed opportunities', () => {
    const result = buildSearchConsoleInsights([
      { query: 'seo tool', clicks: 1, impressions: 100, position: 7 },
      { query: 'seo tool', clicks: 0, impressions: 50, position: 9 },
      { query: 'brand', clicks: 20, impressions: 40, position: 1 },
    ], [{ page: 'https://example.com/a', clicks: 21, impressions: 190, position: 4 }], [
      { query: 'seo tool', page: 'https://example.com/a', clicks: 1, impressions: 150, position: 7.67 },
    ]);

    expect(result.counts).toEqual({ queries: 2, pages: 1, selectedKeywords: 1, selectedPages: 1 });
    expect(result.opportunities.lowCtr[0]).toMatchObject({ query: 'seo tool', clicks: 1, impressions: 150 });
    expect(result.opportunities.selected[0]).toMatchObject({ query: 'seo tool', page: 'https://example.com/a' });
    expect(result.recommendations.map((item) => item.id)).toEqual(expect.arrayContaining(['improve-serp-ctr', 'protect-winners']));
  });

  it('does not invent recommendations without data', () => {
    expect(buildSearchConsoleInsights([], []).recommendations).toEqual([]);
  });

  it('limits the shortlist and selects at most two keywords per page', () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({ query: `query-${index}`, page: index < 5 ? 'https://example.com/a' : `https://example.com/${index}`, clicks: 0, impressions: 200 - index, position: 7 }));
    const selected = buildSearchConsoleInsights([], [], rows).opportunities.selected;
    expect(selected).toHaveLength(8);
    expect(selected.filter((row) => row.page === 'https://example.com/a')).toHaveLength(2);
  });
});
