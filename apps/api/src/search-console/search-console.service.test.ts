import { decryptToken, encryptToken, hashOAuthState } from './search-console.service';

describe('Search Console OAuth crypto', () => {
  it('round-trips encrypted token material without exposing plaintext', () => {
    const encrypted = encryptToken('refresh-token-value');
    expect(encrypted).not.toContain('refresh-token-value');
    expect(decryptToken(encrypted)).toBe('refresh-token-value');
  });

  it('hashes the OAuth state before it is persisted', () => {
    expect(hashOAuthState('state-value')).toHaveLength(64);
    expect(hashOAuthState('state-value')).not.toBe('state-value');
  });
});
