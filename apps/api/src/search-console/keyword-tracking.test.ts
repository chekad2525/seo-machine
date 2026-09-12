import { buildKeywordSuggestions, buildKeywordTracking } from './keyword-tracking';

describe('keyword tracking', () => {
  const tracked = [{ id: 'one', query: 'seo', targetPage: null, createdAt: new Date('2026-09-01') }];
  const metrics = [
    { date: new Date('2026-08-27'), query: 'seo', clicks: 1, impressions: 10, position: 8 },
    { date: new Date('2026-09-04'), query: 'seo', clicks: 3, impressions: 20, position: 5 },
    { date: new Date('2026-09-04'), query: 'audit', clicks: 2, impressions: 40, position: 9 },
  ];

  it('compares the latest complete week with the prior week', () => {
    expect(buildKeywordTracking(tracked, metrics, new Date('2026-09-07'))[0]).toMatchObject({ position: 5, change: -3, clicks: 3, impressions: 20 });
  });

  it('suggests visible untracked queries', () => {
    expect(buildKeywordSuggestions(metrics, new Set(['seo']))).toEqual([{ query: 'audit', clicks: 2, impressions: 40, position: 9 }]);
  });
});
