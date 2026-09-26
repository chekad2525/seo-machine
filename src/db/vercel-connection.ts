export const VERCEL_DATABASE_SCHEMA = "openseo";

export function getVercelPostgresUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must be a PostgreSQL URL");
  }
  // Supabase may provide a Prisma-style schema=public parameter. Postgres.js
  // sends unknown query parameters at startup; set the actual PostgreSQL search
  // path instead so this app cannot read or alter unrelated public tables.
  url.searchParams.delete("schema");
  url.searchParams.set("options", `-c search_path=${VERCEL_DATABASE_SCHEMA}`);
  return url.toString();
}
