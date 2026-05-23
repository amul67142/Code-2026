import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRole);

async function run() {
  const companyId = 'bfba42e0-75f2-4461-a25c-604b73d950e4';
  
  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select(`
      id,
      status,
      razorpay_sub_id,
      current_period_start,
      current_period_end,
      amount_inr,
      plan_id,
      pricing_plans:plan_id (
        id,
        name,
        description,
        price_inr,
        period,
        features
      )
    `)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    console.error("Query Error:", error);
  } else {
    console.log("Subscription Data retrieved by status API:");
    console.log(JSON.stringify(subscription, null, 2));
  }
}

run().catch(console.error);
