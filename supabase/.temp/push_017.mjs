import pg from 'pg';
import fs from 'fs';

const sql = fs.readFileSync('supabase/migrations/017_realtime_notifications.sql', 'utf8');

const client = new pg.Client({
  connectionString: 'postgresql://postgres.hqzyikjgxrswcsjelkra:amuldev2026@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

try {
  await client.connect();
  const result = await client.query(sql);
  console.log('Migration 017 applied successfully!');
  console.log('Command:', result.command);
} catch (err) {
  console.error('ERROR:', err.message);
} finally {
  await client.end();
}
