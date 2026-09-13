import { findDomainRank, selectDataForSeoLocation } from './dataforseo-rank.service';

describe('DataForSEO rank parsing', () => {
  it('finds the first matching organic result across www variants', () => {
    expect(findDomainRank([{ type: 'people_also_ask' }, { type: 'organic', domain: 'www.example.com', url: 'https://www.example.com/page', rank_absolute: 4, rank_group: 3 }], 'example.com')).toMatchObject({ rankAbsolute: 4, rankGroup: 3, resultUrl: 'https://www.example.com/page' });
  });

  it('records a null rank when the domain is absent', () => {
    expect(findDomainRank([{ type: 'organic', domain: 'competitor.com', rank_absolute: 1 }], 'example.com').rankAbsolute).toBeNull();
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
});
