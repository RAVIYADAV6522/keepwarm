// Reset the database to the demo state. Stop `npm run dev` first when using the local PGlite database.
import { getDb } from "@/db";
import { seed } from "@/lib/seed";

async function main() {
  const db = await getDb();
  await seed(db);
  console.log("Seeded demo data.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
