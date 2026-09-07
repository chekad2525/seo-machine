import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schema = path.join(root, 'packages/db/prisma/schema.prisma');
const MIGRATE_TIMEOUT_MS = 180_000;

const migrationUrl = resolveMigrationUrl();

if (!migrationUrl) {
  console.log('[migrations] DATABASE_URL is not set; skipping prisma migrate deploy.');
  process.exit(0);
}

console.log(`[migrations] Applying pending Prisma migrations via ${describe(migrationUrl)}.`);
const result = spawnSync('npx', ['prisma', 'migrate', 'deploy', '--schema', schema], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  timeout: MIGRATE_TIMEOUT_MS,
  env: { ...process.env, DATABASE_URL: migrationUrl },
});

if (result.error?.code === 'ETIMEDOUT') {
  console.error(`[migrations] prisma migrate deploy did not finish within ${MIGRATE_TIMEOUT_MS / 1000}s. This usually means DATABASE_URL points at a transaction-mode pooler (PgBouncer, port 6543). Set DIRECT_DATABASE_URL to a direct or session-mode connection string.`);
  process.exit(1);
}

if (result.status !== 0) {
  console.error('[migrations] prisma migrate deploy failed. If the database was created outside of Prisma Migrate, baseline it with `prisma migrate resolve --applied <migration>` and redeploy.');
  process.exit(result.status ?? 1);
}

/**
 * Prisma Migrate needs a direct (or session-mode) connection: advisory locks and
 * multi-statement DDL do not work through a transaction-mode pooler.
 * Prefer an explicit DIRECT_DATABASE_URL; otherwise rewrite the Supabase
 * transaction pooler (6543) to its session pooler (5432), which shares credentials.
 */
function resolveMigrationUrl() {
  const direct = process.env.DIRECT_DATABASE_URL?.trim();
  if (direct) return direct;

  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    const isSupabasePooler = url.hostname.endsWith('.pooler.supabase.com');
    if (isSupabasePooler && url.port === '6543') {
      url.port = '5432';
      url.searchParams.delete('pgbouncer');
      url.searchParams.delete('connection_limit');
      return url.toString();
    }
    url.searchParams.delete('pgbouncer');
    return url.toString();
  } catch {
    return raw;
  }
}

function describe(value) {
  try {
    const url = new URL(value);
    return `${url.hostname}:${url.port || '5432'}`;
  } catch {
    return 'the configured database';
  }
}
