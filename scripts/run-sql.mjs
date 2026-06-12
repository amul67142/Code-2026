import pg from "pg";

const DATABASE_URL = "postgresql://postgres.hqzyikjgxrswcsjelkra:amuldev2026@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";

async function main() {
  const query = process.argv.slice(2).join(" ");
  if (!query) {
    console.error("Please provide a SQL query to execute.");
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const result = await client.query(query);
    if (Array.isArray(result)) {
      result.forEach((res, i) => {
        console.log(`\n--- Result ${i + 1} ---`);
        console.log(`Command: ${res.command}`);
        if (res.rowCount !== null && res.rowCount !== undefined) {
          console.log(`Affected rows: ${res.rowCount}`);
        }
        if (res.rows && res.rows.length > 0) {
          console.table(res.rows);
        }
      });
    } else {
      console.log(`Command: ${result.command}`);
      if (result.rowCount !== null && result.rowCount !== undefined) {
        console.log(`Affected rows: ${result.rowCount}`);
      }
      if (result.rows && result.rows.length > 0) {
        console.table(result.rows);
      }
    }
  } catch (error) {
    console.error("❌ Query failed:", error.message);
    if (error.detail) console.error("   Detail:", error.detail);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
