/**
 * Run SQL migration 008_pricing_plans_razorpay.sql against Supabase PostgreSQL directly.
 * Usage: node scripts/run-razorpay-plans-migration.mjs
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
      join(__dirname, "..", "supabase", "migrations", "008_pricing_plans_razorpay.sql"),
      "utf-8"
    );

    console.log("🔄 Running schema migration (008_pricing_plans_razorpay.sql)...");
    await client.query(migrationSQL);
    console.log("✅ Schema migration complete!\n");

    // Verify pricing_plans table has razorpay_plan_id column
    const verifyResult = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'pricing_plans' AND column_name = 'razorpay_plan_id';
    `);

    if (verifyResult.rows.length > 0) {
      console.log("📋 Verification Successful: 'pricing_plans.razorpay_plan_id' column is successfully added!");
    } else {
      console.log("❌ Verification Failed: 'pricing_plans.razorpay_plan_id' column is NOT present!");
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
