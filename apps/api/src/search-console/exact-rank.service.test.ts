import { exactRankConfiguration } from './exact-rank.service';

describe('exact rank configuration', () => {
  it('recognizes a configured Serper provider', () => {
    expect(exactRankConfiguration({ SERP_PROVIDER: 'serper', SERPER_API_KEY: 'secret' })).toEqual({
      provider: 'serper', valid: true, configured: true,
    });
  });

  it('requires all DataForSEO credentials and a location', () => {
    expect(exactRankConfiguration({
      SERP_PROVIDER: 'dataforseo', DATAFORSEO_LOGIN: 'user', DATAFORSEO_PASSWORD: 'pass', DATAFORSEO_LOCATION_CODE: '2036',
    }).configured).toBe(true);
    expect(exactRankConfiguration({ SERP_PROVIDER: 'dataforseo', DATAFORSEO_LOGIN: 'user' }).configured).toBe(false);
  });

  it('marks unknown providers as invalid', () => {
    expect(exactRankConfiguration({ SERP_PROVIDER: 'unknown' })).toMatchObject({ valid: false, configured: false });
  });
});
