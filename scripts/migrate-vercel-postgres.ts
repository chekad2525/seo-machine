import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { readMigrationFiles } from "drizzle-orm/migrator";
import {
  getVercelPostgresUrl,
  VERCEL_DATABASE_SCHEMA,
} from "../src/db/vercel-connection";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const sql = postgres(getVercelPostgresUrl(databaseUrl), {
  max: 1,
  prepare: false, // Supabase transaction pooler does not retain prepared queries.
  connect_timeout: 10,
});

try {
  const db = drizzle(sql);
  const migrations = readMigrationFiles({ migrationsFolder: "./drizzle-pg" });
  const publicSchema = '"public".';
  const appSchema = `"${VERCEL_DATABASE_SCHEMA}".`;
  const isolatedMigrations = migrations.map((migration) => ({
    ...migration,
    sql: migration.sql.map((statement) =>
      statement.replaceAll(publicSchema, appSchema),
    ),
  }));

  // Existing repository SQL explicitly qualifies some foreign keys as public.
  // Rewrite those references in memory; the tracked migration files stay intact.
  await db.dialect.migrate(isolatedMigrations, db.session, {
    migrationsFolder: "./drizzle-pg",
    migrationsSchema: VERCEL_DATABASE_SCHEMA,
  });
  console.log("OpenSEO PostgreSQL schema is up to date");
} finally {
  await sql.end({ timeout: 1 });
}
