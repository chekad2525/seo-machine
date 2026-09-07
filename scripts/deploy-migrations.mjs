import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schema = path.join(root, 'packages/db/prisma/schema.prisma');

if (!process.env.DATABASE_URL) {
  console.log('[migrations] DATABASE_URL is not set; skipping prisma migrate deploy.');
  process.exit(0);
}

console.log('[migrations] Applying pending Prisma migrations to the configured database.');
const result = spawnSync('npx', ['prisma', 'migrate', 'deploy', '--schema', schema], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });

if (result.status !== 0) {
  console.error('[migrations] prisma migrate deploy failed. If the database was created outside of Prisma Migrate, baseline it with `prisma migrate resolve --applied <migration>` and redeploy.');
  process.exit(result.status ?? 1);
}
