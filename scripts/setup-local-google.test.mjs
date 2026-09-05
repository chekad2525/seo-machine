import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalEnvironment } from './setup-local-google.mjs';

const config = { web: {
  client_id: 'example.apps.googleusercontent.com', client_secret: 'dummy-test-only',
  redirect_uris: ['http://localhost:3000/api/auth/callback/google',
    'http://localhost:3001/api/v1/integrations/google-search-console/callback'],
} };
const template = ['AUTH_GOOGLE_ID=', 'GSC_CLIENT_ID=', 'AUTH_GOOGLE_SECRET=',
  'GSC_CLIENT_SECRET=', 'AUTH_SECRET=', 'INTERNAL_API_SECRET=',
  'OTP_HASH_SECRET=', 'TOKEN_ENCRYPTION_KEY=', 'GSC_SYNC_ENABLED=false'].join('\n');
test('maps Google credentials and generates independent random internal keys', () => {
  const env = createLocalEnvironment(config, template);
  const values = Object.fromEntries(env.split('\n').map(line => line.split('=')));
  assert.equal(values.AUTH_GOOGLE_ID, values.GSC_CLIENT_ID);
  assert.equal(values.AUTH_GOOGLE_SECRET, values.GSC_CLIENT_SECRET);
  const keys = ['AUTH_SECRET', 'INTERNAL_API_SECRET', 'OTP_HASH_SECRET', 'TOKEN_ENCRYPTION_KEY'].map(k => values[k]);
  keys.forEach(k => assert.match(k, /^[a-f0-9]{64}$/));
  assert.equal(new Set(keys).size, 4);
  assert.notEqual(env, createLocalEnvironment(config, template));
  assert.equal(values.GSC_SYNC_ENABLED, 'false');
});
test('rejects missing callback and non-web client', () => {
  assert.throws(() => createLocalEnvironment({ installed: config.web }, template));
  assert.throws(() => createLocalEnvironment({ web: { ...config.web, redirect_uris: [] } }, template));
});
test('rejects credential newline injection', () => {
  assert.throws(() => createLocalEnvironment({ web: { ...config.web, client_secret: 'test\nBAD=true' } }, template));
});
