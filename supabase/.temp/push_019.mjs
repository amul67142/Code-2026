import pg from 'pg';
import fs from 'fs';

const sql = fs.readFileSync('supabase/migrations/019_whatsapp_template_buttons.sql', 'utf8');

const client = new pg.Client({
  connectionString: 'postgresql://postgres.hqzyikjgxrswcsjelkra:amuldev2026@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

try {
  await client.connect();
  console.log('Connected to Supabase database.');

  const result = await client.query(sql);
  console.log('Migration 019 (whatsapp_template_buttons) applied successfully!');
  console.log('Result:', JSON.stringify(result, null, 2));
} catch (err) {
  console.error('ERROR:', err.message);
} finally {
  await client.end();
  console.log('Connection closed.');
}
