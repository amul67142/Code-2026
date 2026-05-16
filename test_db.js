const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('pg_policies').select('*').eq('tablename', 'notifications');
  console.log('Error:', error);
  console.log('Data:', data);
  
  const { data: acts, error: e2 } = await supabase.from('pg_policies').select('*').eq('tablename', 'activities');
  console.log('Act Error:', e2);
  console.log('Act Data:', acts);
}

test();
