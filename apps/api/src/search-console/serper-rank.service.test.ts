import { findSerperRank } from './serper-rank.service';

describe('Serper rank parsing', () => {
  it('finds a matching result across www variants', () => {
    expect(findSerperRank([
      { link: 'https://competitor.test', position: 1 },
      { link: 'https://www.example.com/page', position: 4 },
    ], 'example.com')).toEqual({ rankAbsolute: 4, rankGroup: 4, resultUrl: 'https://www.example.com/page' });
  });

  it('does not match a different domain', () => {
    expect(findSerperRank([{ link: 'https://notexample.com', position: 1 }], 'example.com')).toEqual({
      rankAbsolute: null, rankGroup: null, resultUrl: null,
    });
  });

  it('counts a ranking URL on a subdomain as part of the tracked domain', () => {
    expect(findSerperRank([{ link: 'https://shop.example.com/product', position: 18 }], 'example.com').rankAbsolute).toBe(18);
  });
});
