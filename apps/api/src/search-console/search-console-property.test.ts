import { matchAccessibleProperty, normalizeProperty } from './search-console-property';

describe('Search Console property matching', () => {
  it('preserves domain properties and normalizes bare domains on the server', () => {
    expect(normalizeProperty(' sc-domain:Example.com ')).toBe('sc-domain:example.com');
    expect(normalizeProperty('example.com')).toBe('https://example.com/');
    expect(normalizeProperty('https://example.com/blog')).toBe('https://example.com/blog');
  });
  it('matches a root URL to an accessible exact-host Domain property', () => {
    expect(matchAccessibleProperty('https://example.com/', [{ siteUrl: 'sc-domain:example.com', permissionLevel: 'siteOwner' }])).toBe('sc-domain:example.com');
  });
  it('matches a Domain property to an accessible root URL', () => {
    expect(matchAccessibleProperty('sc-domain:example.com', [{ siteUrl: 'https://example.com/' }])).toBe('https://example.com/');
  });
  it('does not silently broaden a subdomain or path or accept an unverified site', () => {
    expect(matchAccessibleProperty('https://shop.example.com/', [{ siteUrl: 'sc-domain:example.com' }])).toBeNull();
    expect(matchAccessibleProperty('https://example.com/blog/', [{ siteUrl: 'sc-domain:example.com' }])).toBeNull();
    expect(matchAccessibleProperty('https://example.com/', [{ siteUrl: 'https://example.com/', permissionLevel: 'siteUnverifiedUser' }])).toBeNull();
  });
});
