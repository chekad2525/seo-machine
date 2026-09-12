import { findDomainRank } from './dataforseo-rank.service';

describe('DataForSEO rank parsing', () => {
  it('finds the first matching organic result across www variants', () => {
    expect(findDomainRank([{ type: 'people_also_ask' }, { type: 'organic', domain: 'www.example.com', url: 'https://www.example.com/page', rank_absolute: 4, rank_group: 3 }], 'example.com')).toMatchObject({ rankAbsolute: 4, rankGroup: 3, resultUrl: 'https://www.example.com/page' });
  });
  it('records a null rank when the domain is absent', () => {
    expect(findDomainRank([{ type: 'organic', domain: 'competitor.com', rank_absolute: 1 }], 'example.com').rankAbsolute).toBeNull();
  });
});
