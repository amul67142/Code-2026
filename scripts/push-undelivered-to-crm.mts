/**
 * Send every lead that has not yet reached a CRM connection.
 *
 * The same logic as the Catch up panel in Settings → Connections, runnable
 * without a browser session. Use it when the backlog needs clearing from a
 * terminal; the panel is the normal way.
 *
 *   npx tsx scripts/push-undelivered-to-crm.mts            # report only
 *   npx tsx scripts/push-undelivered-to-crm.mts --send     # actually send
 *
 * "Undelivered" means no crm_delivery_logs row for that connection with a 2xx
 * response, which is what deliver() counts as ok. Re-running is safe: a lead
 * delivered on a previous run is skipped. A lead that FAILED is retried.
 *
 * Prints counts and HTTP statuses only — never lead names, numbers or emails.
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local the way `next dev` would, before importing anything that
// reads process.env at module scope.
for (const line of readFileSync(join(__dirname, "..", ".env.local"), "utf-8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  const value = m[2].replace(/^["']|["']$/g, "");
  if (!process.env[m[1]]) process.env[m[1]] = value;
}

const { createAdminClient } = await import("@/lib/supabase/admin");
const { sendLeadToConnections } = await import("@/lib/crm/outbound");

const SEND = process.argv.includes("--send");
const PAGE = 1000;
const MAX_SCAN = 20_000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function collectIds(build: (from: number, to: number) => any, column: string) {
  const ids: string[] = [];
  for (let from = 0; from < MAX_SCAN; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data || []) as Record<string, string>[];
    for (const r of rows) if (r[column]) ids.push(r[column]);
    if (rows.length < PAGE) break;
  }
  return ids;
}

const admin = createAdminClient();

const { data: connections, error } = await admin
  .from("crm_connections")
  .select("*")
  .eq("is_active", true);

if (error) throw new Error(`Could not load connections: ${error.message}`);
if (!connections?.length) {
  console.log("No active connections. Nothing to do.");
  process.exit(0);
}

console.log(
  `${SEND ? "SENDING" : "DRY RUN — pass --send to actually send"}\n` +
    `${connections.length} active connection(s)\n`
);

for (const conn of connections) {
  const leadIds = await collectIds((from, to) => {
    let q = admin
      .from("leads")
      .select("id")
      .eq("company_id", conn.company_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .range(from, to);
    if (conn.project_id) q = q.eq("project_id", conn.project_id);
    return q;
  }, "id");

  const delivered = new Set(
    await collectIds(
      (from, to) =>
        admin
          .from("crm_delivery_logs")
          .select("lead_id")
          .eq("company_id", conn.company_id)
          .eq("connection_id", conn.id)
          .gte("response_status", 200)
          .lt("response_status", 300)
          .range(from, to),
      "lead_id"
    )
  );

  const pending = leadIds.filter((id) => !delivered.has(id));

  console.log(`── ${conn.name} (${conn.auto_send ? "Automatic" : "Manual only"})`);
  console.log(`   scope           ${conn.project_id ? "one project" : "all projects"}`);
  console.log(`   leads in scope  ${leadIds.length}`);
  console.log(`   already sent    ${delivered.size}`);
  console.log(`   outstanding     ${pending.length}`);

  if (!SEND || !pending.length) {
    console.log("");
    continue;
  }

  let sent = 0;
  let failed = 0;
  for (const [i, leadId] of pending.entries()) {
    const res = await sendLeadToConnections({
      companyId: conn.company_id,
      leadId,
      connections: [conn],
      trigger: "MANUAL",
    });
    sent += res.sent;
    failed += res.failed;
    if ((i + 1) % 10 === 0 || i === pending.length - 1) {
      console.log(`   … ${i + 1}/${pending.length}  sent ${sent}, failed ${failed}`);
    }
    // Gentle on the receiving endpoint — Pabbly and friends rate-limit.
    await new Promise((r) => setTimeout(r, 250));
  }
  console.log(`   done            ${sent} sent, ${failed} failed\n`);
}

console.log("Finished.");
process.exit(0);
