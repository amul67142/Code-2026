import pg from "pg";

const DATABASE_URL = "postgresql://postgres.hqzyikjgxrswcsjelkra:amuldev2026@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";

async function main() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("🔌 Connected to database");

    // Check tables
    const tablesResult = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'pricing_plans';
    `);

    if (tablesResult.rows.length === 0) {
      console.log("❌ Table 'pricing_plans' does NOT exist!");
      return;
    }

    console.log("✅ Table 'pricing_plans' exists!");

    // Check rows
    const rowsResult = await client.query(`SELECT id, name, price_inr, period FROM pricing_plans ORDER BY sort_order;`);
    console.log("📋 Plans in database:");
    rowsResult.rows.forEach(row => {
      console.log(`   - ${row.name}: ₹${row.price_inr}${row.period || ''} (${row.id})`);
    });

  } catch (error) {
    console.error("❌ Error checking database:", error.message);
  } finally {
    await client.end();
  }
}

main();
