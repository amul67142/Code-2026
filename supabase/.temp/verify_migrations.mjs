import pg from 'pg';

const client = new pg.Client({
  connectionString: 'postgresql://postgres.hqzyikjgxrswcsjelkra:amuldev2026@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

await client.connect();

// 015 — Check performance indexes
const indexes = await client.query(`
  SELECT indexname FROM pg_indexes
  WHERE tablename = 'leads'
    AND indexname IN (
      'idx_leads_active_created',
      'idx_leads_assigned_active',
      'idx_leads_name_trgm',
      'idx_leads_phone_trgm',
      'idx_leads_email_trgm'
    )
  ORDER BY indexname;
`);

// 016 — Check WhatsApp inbound columns
const columns = await client.query(`
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name = 'whatsapp_connections'
    AND column_name IN ('qualify_keywords', 'qualify_stage_id')
  ORDER BY column_name;
`);

// 017 — Check realtime publication
const realtime = await client.query(`
  SELECT tablename FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
    AND tablename = 'notifications';
`);

console.log('=== 015: Performance Indexes ===');
console.log(indexes.rows.length === 5 ? '✅ All 5 indexes present' : '❌ Missing indexes');
indexes.rows.forEach(r => console.log('  •', r.indexname));

console.log('\n=== 016: WhatsApp Inbound Columns ===');
console.log(columns.rows.length === 2 ? '✅ Both columns present' : '❌ Missing columns');
columns.rows.forEach(r => console.log('  •', r.column_name, `(${r.data_type})`));

console.log('\n=== 017: Realtime Notifications ===');
console.log(realtime.rows.length === 1 ? '✅ notifications in supabase_realtime' : '❌ Not in publication');

await client.end();
