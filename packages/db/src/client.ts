import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Prisma must know when it talks to a transaction-mode pooler (PgBouncer /
 * Supabase port 6543), otherwise prepared statements collide across pooled
 * sessions and queries fail intermittently. Add the flag when the URL is
 * clearly a pooler and the operator forgot it.
 */
function runtimeDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    const looksPooled = url.port === '6543' || url.hostname.includes('pooler.');
    if (looksPooled && !url.searchParams.has('pgbouncer')) {
      url.searchParams.set('pgbouncer', 'true');
      if (!url.searchParams.has('connection_limit')) url.searchParams.set('connection_limit', '1');
    }
    return url.toString();
  } catch {
    return raw;
  }
}

function createClient(): PrismaClient {
  const url = runtimeDatabaseUrl();
  return url ? new PrismaClient({ datasources: { db: { url } } }) : new PrismaClient();
}

export const prisma = globalThis.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;
