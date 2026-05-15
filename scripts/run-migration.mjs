/**
 * Run SQL migration against Supabase PostgreSQL directly.
 * Usage: node scripts/run-migration.mjs
 */
import pg from "pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Password corrected to amuldev2026
const DATABASE_URL = "postgresql://postgres.hqzyikjgxrswcsjelkra:amuldev2026@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";

async function main() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("🔌 Connecting to Supabase PostgreSQL (Transaction Pooler)...");
    await client.connect();
    console.log("✅ Connected!\n");

    // Run schema migration
    const migrationSQL = readFileSync(
      join(__dirname, "..", "supabase", "migrations", "001_initial_schema.sql"),
      "utf-8"
    );

    console.log("🔄 Running schema migration (001_initial_schema.sql)...");
    await client.query(migrationSQL);
    console.log("✅ Schema migration complete!\n");

    // Run seed data
    const seedSQL = readFileSync(
      join(__dirname, "..", "supabase", "seed.sql"),
      "utf-8"
    );

    console.log("🔄 Running seed data...");
    await client.query(seedSQL);
    console.log("✅ Seed data inserted!\n");

    // Verify tables
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log("📋 Tables created:");
    result.rows.forEach((row) => console.log("   ✓ " + row.table_name));
    console.log("\n✨ Total: " + result.rows.length + " tables");

  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    if (error.detail) console.error("   Detail:", error.detail);
    if (error.position) console.error("   Position:", error.position);
    process.exit(1);
  } finally {
    await client.end();
    console.log("\n🔌 Disconnected.");
  }
}

main();
