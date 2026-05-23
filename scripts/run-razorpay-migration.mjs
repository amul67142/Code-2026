/**
 * Run SQL migration 007_razorpay_billing.sql against Supabase PostgreSQL directly.
 * Usage: node scripts/run-razorpay-migration.mjs
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
      join(__dirname, "..", "supabase", "migrations", "007_razorpay_billing.sql"),
      "utf-8"
    );

    console.log("🔄 Running schema migration (007_razorpay_billing.sql)...");
    await client.query(migrationSQL);
    console.log("✅ Schema migration complete!\n");

    // Verify subscriptions table has razorpay columns
    const verifyResult = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'razorpay_sub_id';
    `);

    if (verifyResult.rows.length > 0) {
      console.log("📋 Verification Successful: 'subscriptions.razorpay_sub_id' column is successfully added!");
    } else {
      console.log("❌ Verification Failed: 'subscriptions.razorpay_sub_id' column is NOT present!");
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
