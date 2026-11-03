/**
 * Submit the billing reminder WhatsApp template to Meta, on the platform
 * (SpaceTrans) WhatsApp account, and record it locally so the daily reminder
 * job can see its approval status.
 *
 *   npx tsx scripts/create-billing-reminder-template.mts
 *
 * Run once. Meta reviews it (usually minutes to a few hours); after that,
 * press Sync status on the SpaceTrans Templates page so BigLead sees the
 * approval. Until then reminders go by email only.
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
for (const line of readFileSync(join(__dirname, "..", ".env.local"), "utf-8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const { createAdminClient } = await import("@/lib/supabase/admin");
const { decryptToken } = await import("@/lib/integrations/crypto");
const { createMetaTemplate } = await import("@/lib/integrations/whatsapp");
const { BILLING_REMINDER_TEMPLATE: T } = await import("@/lib/billing/reminders");

const admin = createAdminClient();
const { data: platform } = await admin.from("companies").select("id, name").eq("is_platform", true).maybeSingle();
if (!platform) throw new Error("No platform company (companies.is_platform). Run migration 028 first.");

const { data: conn } = await admin
  .from("whatsapp_connections")
  .select("waba_id, access_token_enc, status")
  .eq("company_id", platform.id)
  .maybeSingle();
if (!conn || conn.status !== "ACTIVE" || !conn.waba_id) {
  throw new Error(`${platform.name} has no active WhatsApp connection with a linked account.`);
}

const { data: existing } = await admin
  .from("whatsapp_templates")
  .select("status")
  .eq("company_id", platform.id)
  .eq("name", T.name)
  .eq("language", T.language)
  .maybeSingle();
if (existing) {
  console.log(`Already submitted: ${T.name} is ${existing.status}. Nothing to do.`);
  process.exit(0);
}

const res = await createMetaTemplate(conn.waba_id, decryptToken(conn.access_token_enc), {
  name: T.name,
  language: T.language,
  category: T.category,
  bodyText: T.body,
  examples: T.samples,
  buttons: [],
});
const status = String(res.status || "PENDING").toUpperCase();

const { error } = await admin.from("whatsapp_templates").insert({
  company_id: platform.id,
  name: T.name,
  language: T.language,
  category: T.category,
  body_text: T.body,
  sample_values: T.samples,
  status,
  meta_template_id: res.id || null,
  // Not a customer welcome or an agent alert: BigLead's own billing notice.
  purpose: "OTHER",
});
if (error) console.error("Submitted to Meta, but saving locally failed — press Sync on the Templates page:", error.message);

console.log(`Submitted ${T.name} to Meta on ${platform.name}'s account. Status: ${status}`);
process.exit(0);
