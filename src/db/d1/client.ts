import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

// Keep the D1 handle lazy when the Vercel deployment selects Postgres. The
// binding does not exist on Vercel, but schema types still use this module.
export const d1Db =
  process.env.VERCEL === "1"
    ? (null as unknown as ReturnType<typeof drizzle<typeof schema>>)
    : drizzle(env.DB, { schema });
