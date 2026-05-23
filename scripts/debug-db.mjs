import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRole) {
  console.error("Missing Supabase URL or Service Role Key in environment!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRole);

async function run() {
  console.log("🔍 Fetching Users...");
  const { data: users, error: userErr } = await supabase
    .from('users')
    .select('id, name, email, role, company_id');
  
  if (userErr) {
    console.error("Error fetching users:", userErr);
  } else {
    console.table(users);
  }

  console.log("\n🔍 Fetching Companies...");
  const { data: companies, error: compErr } = await supabase
    .from('companies')
    .select('id, name, plan, status, trial_ends_at');
  
  if (compErr) {
    console.error("Error fetching companies:", compErr);
  } else {
    console.table(companies);
  }

  console.log("\n🔍 Fetching Subscriptions...");
  const { data: subscriptions, error: subErr } = await supabase
    .from('subscriptions')
    .select('id, company_id, status, plan_id, razorpay_sub_id, amount_inr, current_period_end');

  if (subErr) {
    console.error("Error fetching subscriptions:", subErr);
  } else {
    console.table(subscriptions);
  }

  console.log("\n🔍 Fetching Pricing Plans...");
  const { data: plans, error: planErr } = await supabase
    .from('pricing_plans')
    .select('id, name, price_inr, razorpay_plan_id');

  if (planErr) {
    console.error("Error fetching pricing plans:", planErr);
  } else {
    console.table(plans);
  }
}

run().catch(console.error);
