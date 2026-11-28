/**
 * One-time fix: move leads whose agents already recorded a status to the
 * stage that status calls for (same rule as saving a status — forward only,
 * never to a closed stage). Logs a STAGE_CHANGE activity on each moved lead.
 *
 *   npx tsx scripts/backfill-auto-stage.mts            # dry run: counts only
 *   npx tsx scripts/backfill-auto-stage.mts --apply    # make the changes
 *
 * Uses the service-role key from .env.local (the live database).
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { autoStageFor, latestStatus, type StageRow } from "../lib/leads/auto-stage";

dotenv.config({ path: ".env.local", quiet: true });
const apply = process.argv.includes("--apply");

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

type LeadRow = { id: string; stage_id: string | null } & Record<string, string | null>;

const { data: companies } = await db.from("companies").select("id, name").order("name");
let total = 0;

for (const c of companies || []) {
  const { data: stageRows } = await db
    .from("pipeline_stages")
    .select("id, name, stage_order, is_won, is_terminal")
    .eq("company_id", c.id);
  const stages = (stageRows || []) as StageRow[];
  if (!stages.length) continue;

  const { data: leadRows } = await db
    .from("leads")
    .select("id, stage_id, status_1, status_2, status_3, status_4, status_5, status_6")
    .eq("company_id", c.id)
    .is("deleted_at", null)
    .or("status_1.not.is.null,status_2.not.is.null,status_3.not.is.null,status_4.not.is.null,status_5.not.is.null,status_6.not.is.null")
    .limit(10000);
  const leads = (leadRows || []) as LeadRow[];

  const moves = new Map<string, number>();
  const todo: { id: string; from: string | null; to: StageRow; status: string }[] = [];
  for (const l of leads) {
    const status = latestStatus(l);
    const dest = autoStageFor(status, l.stage_id, stages);
    if (!dest || !status) continue;
    const from = stages.find((s) => s.id === l.stage_id)?.name || "(none)";
    const key = `${from} → ${dest.name}`;
    moves.set(key, (moves.get(key) || 0) + 1);
    todo.push({ id: l.id, from: l.stage_id, to: dest, status });
  }

  console.log(`
${c.name}: ${leads.length} leads with a status, ${todo.length} to move`);
  for (const [k, n] of [...moves].sort((a, b) => b[1] - a[1])) console.log(`  ${n.toString().padStart(4)}  ${k}`);
  total += todo.length;

  if (apply && todo.length) {
    let moved = 0;
    for (const t of todo) {
      const { error } = await db
        .from("leads")
        .update({ stage_id: t.to.id, updated_at: new Date().toISOString() })
        .eq("id", t.id)
        .eq("company_id", c.id);
      if (error) {
        console.error(`  ✗ ${t.id}: ${error.message}`);
        continue;
      }
      const fromName = stages.find((s) => s.id === t.from)?.name;
      await db.from("activities").insert({
        lead_id: t.id,
        user_id: null,
        type: "STAGE_CHANGE",
        description: `Stage moved to ${t.to.name}${fromName ? ` from ${fromName}` : ""} (status: ${t.status}) — pipeline catch-up`,
        metadata: { from_stage_id: t.from, to_stage_id: t.to.id, reason: "status_backfill", status: t.status },
      });
      moved++;
    }
    console.log(`  ✓ moved ${moved}`);
  }
}

console.log(`
${apply ? "Moved" : "Would move"} ${total} leads in total.${apply ? "" : " Run with --apply to make the changes."}`);
