require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from("webhook_logs")
    .select("id, status, error_message, payload_json, created_at")
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) {
    console.error("Error fetching logs:", error);
  } else {
    console.log("Latest Webhook Logs:");
    console.log(JSON.stringify(data, null, 2));
  }
}
check();
