import fs from 'fs';
import pg from 'pg';

const sql = fs.readFileSync('supabase/migrations/015_performance_indexes.sql', 'utf8');

const client = new pg.Client({
  connectionString: 'postgresql://postgres.hqzyikjgxrswcsjelkra:amuldev2026@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

try {
  await client.connect();
  console.log('Connected to Supabase database.');
  
  const result = await client.query(sql);
  console.log('Migration applied successfully!');
  console.log('Result:', JSON.stringify(result, null, 2));
} catch (err) {
  console.error('Error:', err.message);
} finally {
  await client.end();
  console.log('Connection closed.');
}
