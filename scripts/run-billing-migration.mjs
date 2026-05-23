/**
 * Run SQL migration 006_cashfree_billing.sql against Supabase PostgreSQL directly.
 * Usage: node scripts/run-billing-migration.mjs
 */
import pg from "pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = "postgresql://postgres.hqzyikjgxrswcsjelkra:amuldev2026@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";

async function main() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("🔌 Connecting to Supabase PostgreSQL...");
    await client.connect();
    console.log("✅ Connected!\n");

    // Run schema migration
    const migrationSQL = readFileSync(
      join(__dirname, "..", "supabase", "migrations", "006_cashfree_billing.sql"),
      "utf-8"
    );

    console.log("🔄 Running schema migration (006_cashfree_billing.sql)...");
    await client.query(migrationSQL);
    console.log("✅ Schema migration complete!\n");

    // Verify invoices table exists and column additions
    const verifyResult = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'invoices';
    `);

    if (verifyResult.rows.length > 0) {
      console.log("📋 Verification Successful: 'invoices' table is created!");
    } else {
      console.log("❌ Verification Failed: 'invoices' table is NOT present!");
    }

  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    if (error.detail) console.error("   Detail:", error.detail);
    process.exit(1);
  } finally {
    await client.end();
    console.log("\n🔌 Disconnected.");
  }
}

main();
