import pg from 'pg';

const sql = `
ALTER TABLE whatsapp_connections
  ADD COLUMN IF NOT EXISTS qualify_keywords TEXT,
  ADD COLUMN IF NOT EXISTS qualify_stage_id UUID
    REFERENCES pipeline_stages(id) ON DELETE SET NULL;
`;

const client = new pg.Client({
  connectionString: 'postgresql://postgres.hqzyikjgxrswcsjelkra:amuldev2026@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

try {
  await client.connect();
  const result = await client.query(sql);
  console.log('Migration 016 applied successfully!');
  console.log('Command:', result.command);
} catch (err) {
  console.error('ERROR:', err.message);
} finally {
  await client.end();
}
