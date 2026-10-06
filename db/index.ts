import path from "node:path";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "./schema";

// One schema, two drivers:
//   DATABASE_URL set  -> Neon serverless Postgres (production)
//   otherwise         -> PGlite, an embedded Postgres stored in ./.pglite (local, zero setup)
// Both speak the same Postgres dialect, so the rest of the app never knows which one it got.
export type Db = PgliteDatabase<typeof schema>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");

async function connect(): Promise<Db> {
  if (process.env.DATABASE_URL) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    return drizzle(neon(process.env.DATABASE_URL), { schema }) as unknown as Db;
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  // On Vercel without a DATABASE_URL, fall back to /tmp: a throwaway demo database, re-seeded on cold start.
  const dir = process.env.PGLITE_DIR ?? (process.env.VERCEL ? "/tmp/keepwarm-pglite" : path.join(process.cwd(), ".pglite"));
  const db = drizzle(new PGlite(dir), { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });

  // First run on a fresh machine: load the demo data so the app is never empty.
  const existing = await db.select({ id: schema.customers.id }).from(schema.customers).limit(1);
  if (existing.length === 0) {
    const { seed } = await import("@/lib/seed");
    await seed(db);
  }
  return db;
}

// Keep one connection per process (Next dev hot-reloads modules; PGlite must not be opened twice).
const g = globalThis as unknown as { __keepwarmDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  g.__keepwarmDb ??= connect();
  return g.__keepwarmDb;
}

export { schema };
