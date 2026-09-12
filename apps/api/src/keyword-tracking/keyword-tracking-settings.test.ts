import { DEFAULT_KEYWORD_TRACKING_SETTINGS, resolveKeywordTrackingSettings, trackingLocationCode } from './keyword-tracking-settings';

describe('keyword tracking settings', () => {
  it('uses stable project defaults', () => expect(resolveKeywordTrackingSettings()).toEqual(DEFAULT_KEYWORD_TRACKING_SETTINGS));
  it('normalizes codes and generates separate history keys', () => {
    const desktop = resolveKeywordTrackingSettings({ countryCode: 'AE', languageCode: 'AR', locationName: ' Dubai ', device: 'desktop' });
    expect(desktop).toEqual({ countryCode: 'ae', languageCode: 'ar', locationName: 'Dubai', device: 'desktop' });
    expect(trackingLocationCode(desktop)).not.toBe(trackingLocationCode({ ...desktop, locationName: 'Abu Dhabi' }));
  });
});
