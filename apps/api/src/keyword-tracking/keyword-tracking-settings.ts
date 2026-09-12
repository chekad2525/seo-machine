export type KeywordTrackingSettings = {
  countryCode: string;
  languageCode: string;
  locationName: string;
  device: 'desktop' | 'mobile';
};

export const DEFAULT_KEYWORD_TRACKING_SETTINGS: KeywordTrackingSettings = {
  countryCode: 'ir',
  languageCode: 'fa',
  locationName: 'Iran',
  device: 'desktop',
};

export function resolveKeywordTrackingSettings(value?: Partial<KeywordTrackingSettings> | null): KeywordTrackingSettings {
  return {
    countryCode: value?.countryCode?.trim().toLowerCase() || DEFAULT_KEYWORD_TRACKING_SETTINGS.countryCode,
    languageCode: value?.languageCode?.trim().toLowerCase() || DEFAULT_KEYWORD_TRACKING_SETTINGS.languageCode,
    locationName: value?.locationName?.trim() || DEFAULT_KEYWORD_TRACKING_SETTINGS.locationName,
    device: value?.device === 'mobile' ? 'mobile' : 'desktop',
  };
}

export function trackingLocationCode(settings: KeywordTrackingSettings) {
  const key = `${settings.countryCode}:${settings.languageCode}:${settings.locationName.toLocaleLowerCase('en')}`;
  let hash = 0;
  for (let index = 0; index < key.length; index++) hash = ((hash << 5) - hash + key.charCodeAt(index)) | 0;
  return Math.abs(hash) || 1;
}
