require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from("leads")
    .select(`
      id,
      source,
      created_at,
      stage:pipeline_stages(id, name, color),
      assigned_user:users!leads_assigned_to_fkey(id, name)
    `)
    .limit(5);

  if (error) {
    console.error("Query Error:", error);
  } else {
    console.log("Query Success:", data);
  }
}
test();
