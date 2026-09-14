import { fallbackDataForSeoCoordinates, findDomainRank, selectDataForSeoLocation } from './dataforseo-rank.service';

describe('DataForSEO rank parsing', () => {
  it('finds the first matching organic result across www variants', () => {
    expect(findDomainRank([{ type: 'people_also_ask' }, { type: 'organic', domain: 'www.example.com', url: 'https://www.example.com/page', rank_absolute: 4, rank_group: 3 }], 'example.com')).toMatchObject({ rankAbsolute: 4, rankGroup: 3, resultUrl: 'https://www.example.com/page' });
  });

  it('records a null rank when the domain is absent', () => {
    expect(findDomainRank([{ type: 'organic', domain: 'competitor.com', rank_absolute: 1 }], 'example.com').rankAbsolute).toBeNull();
  });

  it('counts a ranking URL on a subdomain as part of the tracked domain', () => {
    expect(findDomainRank([{ type: 'organic', domain: 'shop.example.com', url: 'https://shop.example.com/product', rank_absolute: 18 }], 'example.com').rankAbsolute).toBe(18);
  });
});

describe('DataForSEO location resolution', () => {
  const locations = [
    { location_code: 2036, location_name: 'Iran', country_iso_code: 'IR', location_type: 'Country' },
    { location_code: 1012345, location_name: 'Tehran,Tehran Province,Iran', country_iso_code: 'IR', location_type: 'City' },
  ];

  it('maps a friendly city and country value to the canonical city location', () => {
    expect(selectDataForSeoLocation(locations, 'Tehran, Iran', 'ir')?.location_code).toBe(1012345);
  });

  it('falls back to the country location when a city is unavailable', () => {
    expect(selectDataForSeoLocation(locations, 'Unknown city, Iran', 'ir')?.location_code).toBe(2036);
  });

  it('uses real Iranian coordinates when Google does not provide an Iran location code', () => {
    expect(fallbackDataForSeoCoordinates('Tehran, Iran', 'ir')).toBe('35.6892,51.3890,12z');
    expect(fallbackDataForSeoCoordinates('Iran', 'ir')).toBe('32.4279,53.6880,5z');
    expect(fallbackDataForSeoCoordinates('Iran', 'ae')).toBeNull();
  });
});
