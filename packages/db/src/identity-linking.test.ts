import { normalizeEmail, normalizePhone } from './identity-linking';

describe('identity normalization', () => {
  it('normalizes emails for canonical lookup', () => {
    expect(normalizeEmail('  Founder@Example.COM ')).toBe('founder@example.com');
  });

  it('accepts E.164 phones and rejects ambiguous numbers', () => {
    expect(normalizePhone('+98 912 123 4567')).toBe('+989121234567');
    expect(normalizePhone('09121234567')).toBeNull();
  });
});
