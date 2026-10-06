// Apply migrations to the production (Neon) database. Locally, PGlite migrates itself on startup.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("DATABASE_URL not set; local PGlite migrates itself on startup.");
    return;
  }
  await migrate(drizzle(neon(process.env.DATABASE_URL)), { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
