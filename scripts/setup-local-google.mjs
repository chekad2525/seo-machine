import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const callbacks = [
  'http://localhost:3000/api/auth/callback/google',
  'http://localhost:3001/api/v1/integrations/google-search-console/callback',
];

export function createLocalEnvironment(config, template) {
  const client = config?.web;
  if (!client || typeof client.client_id !== 'string' ||
      !/^[a-zA-Z0-9._-]+\.apps\.googleusercontent\.com$/.test(client.client_id) ||
      typeof client.client_secret !== 'string' ||
      !/^[a-zA-Z0-9_-]+$/.test(client.client_secret) ||
      !callbacks.every(uri => client.redirect_uris?.includes(uri))) {
    throw new Error('Expected a Google web client with both local callback URLs.');
  }
  const replacements = {
    AUTH_GOOGLE_ID: client.client_id, GSC_CLIENT_ID: client.client_id,
    AUTH_GOOGLE_SECRET: client.client_secret, GSC_CLIENT_SECRET: client.client_secret,
    AUTH_SECRET: randomBytes(32).toString('hex'),
    INTERNAL_API_SECRET: randomBytes(32).toString('hex'),
    OTP_HASH_SECRET: randomBytes(32).toString('hex'),
    TOKEN_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
  };
  return template.split(/\r?\n/).map(line => {
    const key = line.split('=', 1)[0];
    return Object.hasOwn(replacements, key) ? `${key}=${replacements[key]}` : line;
  }).join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (!process.argv[2]) throw new Error('Supply the path to the downloaded Google JSON file.');
    const config = JSON.parse(readFileSync(process.argv[2], 'utf8'));
    const output = createLocalEnvironment(config, readFileSync(resolve(root, '.env.example'), 'utf8'));
    // Never overwrite existing credentials or encryption keys.
    writeFileSync(resolve(root, '.env'), output, { flag: 'wx', mode: 0o600 });
    console.log('Local .env created. Both callbacks validated. No credentials printed.');
  } catch (error) {
    console.error(error?.code === 'EEXIST'
      ? 'Existing .env preserved; no credentials changed.'
      : 'Setup failed. Check the JSON path, web client, and both local callbacks. No credentials printed.');
    process.exitCode = 1;
  }
}
