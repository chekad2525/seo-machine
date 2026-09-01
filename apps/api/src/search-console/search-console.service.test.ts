import { decryptToken, encryptToken, hashOAuthState, SearchConsoleService } from './search-console.service';

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

  it('does not send a Search Console property as a Google account login hint', () => {
    const originalClientId = process.env.GSC_CLIENT_ID;
    process.env.GSC_CLIENT_ID = 'test-client';
    try {
      const service = new SearchConsoleService() as unknown as { authorizationUrl(state: string, verifier: string): string };
      const url = new URL(service.authorizationUrl('state-value', 'verifier-value'));
      expect(url.searchParams.has('login_hint')).toBe(false);
      expect(url.searchParams.get('include_granted_scopes')).toBe('true');
    } finally {
      if (originalClientId === undefined) delete process.env.GSC_CLIENT_ID;
      else process.env.GSC_CLIENT_ID = originalClientId;
    }
  });
});
