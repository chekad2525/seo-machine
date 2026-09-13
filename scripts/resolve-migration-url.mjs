export function resolveMigrationDatabaseUrl(env = process.env) {
  const directUrl = env.DIRECT_URL?.trim();
  if (directUrl) return { url: directUrl, source: 'DIRECT_URL' };

  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl) return { url: '', source: 'missing' };

  try {
    const parsed = new URL(databaseUrl);
    if (parsed.hostname.endsWith('.pooler.supabase.com') && parsed.port === '6543') {
      parsed.port = '5432';
      parsed.searchParams.delete('pgbouncer');
      return { url: parsed.toString(), source: 'Supabase Session Pooler' };
    }
  } catch {
    return { url: databaseUrl, source: 'DATABASE_URL' };
  }

  return { url: databaseUrl, source: 'DATABASE_URL' };
}
