import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

const origin = 'http://127.0.0.1:3100';
const marker = 'web-boundary-smoke-test-secret-do-not-deploy';
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', 'apps/web', '-p', '3100', '-H', '127.0.0.1'], {
  windowsHide: true,
  env: { ...process.env, AUTH_SECRET: marker, INTERNAL_API_SECRET: marker, APP_ORIGIN: origin, AUTH_URL: origin, AUTH_TRUST_HOST: 'true', NODE_ENV: 'production' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let ready = false;
let logs = '';
let spawnError;
server.on('error', (error) => { spawnError = error; });
server.stdout.on('data', (chunk) => { logs += chunk; if (logs.includes('Ready in')) ready = true; });
server.stderr.on('data', (chunk) => { logs += chunk; });
try {
  for (let attempt = 0; attempt < 120 && !ready && server.exitCode === null && !spawnError; attempt++) await delay(250);
  assert.ok(ready && server.exitCode === null && !spawnError, `Web server could not start: ${spawnError ?? logs}`);
  for (const path of ['/api/setup', '/api/gsc/prepare', '/api/gsc/sync']) {
    const send = (requestOrigin, contentType = 'application/json') => fetch(origin + path, { method: 'POST', headers: { origin: requestOrigin, 'content-type': contentType, 'x-user-id': 'attacker', 'x-forwarded-host': 'attacker.example' }, body: '{}' });
    assert.equal((await send('https://attacker.example')).status, 403, `${path}: cross-origin request`);
    assert.equal((await send(origin, 'text/plain')).status, 403, `${path}: non-JSON request`);
    assert.equal((await send(origin)).status, 401, `${path}: unauthenticated request`);
  }
  const page = await fetch(origin + '/sign-in');
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.ok(html.includes('name="phone"') && html.includes('name="code"'), 'Phone entry forms must render.');
  assert.ok(!html.includes(marker), 'Server secrets must not appear in HTML.');
  console.log('Web boundary checks passed: origin, content type, session enforcement, and phone form rendering.');
} finally {
  server.kill();
}
