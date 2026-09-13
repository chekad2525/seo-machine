import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.env.VERCEL_ENV !== 'production') {
  console.log(`[database] Migration skipped for ${process.env.VERCEL_ENV ?? 'local'} build.`);
  process.exit(0);
}

const migrationDatabaseUrl = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!migrationDatabaseUrl) {
  console.error('[database] DIRECT_URL or DATABASE_URL is required for the production migration.');
  process.exit(1);
}

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
console.log('[database] Applying pending Prisma migrations to Production.');
const migration = spawnSync(npmCommand, ['run', 'db:migrate'], {
  cwd: repositoryRoot,
  env: { ...process.env, DATABASE_URL: migrationDatabaseUrl },
  stdio: 'inherit',
});

if (migration.error) {
  console.error(`[database] Could not start Prisma migration: ${migration.error.message}`);
  process.exit(1);
}

process.exit(migration.status ?? 1);
