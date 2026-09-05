import { loadEnvFile } from 'node:process';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const commands = {
  dev: ['node_modules/concurrently/dist/bin/concurrently.js',
    'npm run dev -w @seo-machine/api', 'npm run dev -w @seo-machine/web'],
  migrate: ['node_modules/prisma/build/index.js', 'migrate', 'deploy',
    '--schema', 'packages/db/prisma/schema.prisma'],
};
const command = commands[process.argv[2]];
if (!command) {
  console.error('Usage: node scripts/local.mjs dev|migrate (Node 22+)');
  process.exitCode = 1;
} else {
  try {
    loadEnvFile(resolve(root, '.env'));
    const child = spawn(process.execPath, command, {
      cwd: root, env: process.env, stdio: 'inherit', windowsHide: true,
    });
    child.on('error', () => { console.error('Could not launch local tools.'); process.exitCode = 1; });
    child.on('exit', code => { process.exitCode = code ?? 1; });
  } catch {
    console.error('Could not load local .env. Run setup-local-google.mjs first.');
    process.exitCode = 1;
  }
}
