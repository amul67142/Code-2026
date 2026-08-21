/**
 * Seed the AI Agent with the Trident Parktown knowledge base.
 *
 * Loads docs/clients/trident-parktown/ into the database via the Supabase
 * REST API (service role): agent config instructions, the "Trident Parktown"
 * project, 3 knowledge docs, the facts CSV, and 4 qualification fields.
 *
 * Idempotent — safe to re-run: docs are replaced by title, facts are wiped
 * and re-imported for the project, config fields are merged.
 *
 *   node scripts/seed-trident-kb.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const kbDir = resolve(root, "docs/clients/trident-parktown");

const env = {};
for (const line of readFileSync(resolve(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_0-9]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) throw new Error("Supabase env missing in .env.local");

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function rest(path, init = {}) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method || "GET"} ${path} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

/** Strip the "# Paste into: …" instruction header from a KB file. */
function fileBody(name) {
  const raw = readFileSync(resolve(kbDir, name), "utf8");
  return raw.replace(/^# Paste into:.*\r?\n+/, "").trim();
}

// Anchor on the company that owns the ACTIVE WhatsApp connection — the bot
// runs on inbound WhatsApp, so config on any other company would never fire.
const [conn] = await rest("whatsapp_connections?select=company_id&status=eq.ACTIVE&limit=1");
if (!conn) throw new Error("No ACTIVE WhatsApp connection found — connect WhatsApp first.");
const [company] = await rest(`companies?select=id,name&id=eq.${conn.company_id}`);
console.log(`Company (owns the WhatsApp number): ${company.name} (${company.id})`);

// ── 1. Project ─────────────────────────────────────────────────
let [project] = await rest(
  `projects?select=id,name&company_id=eq.${company.id}&name=eq.${encodeURIComponent("Trident Parktown")}`
);
if (!project) {
  [project] = await rest("projects", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      company_id: company.id,
      name: "Trident Parktown",
      type: "PLOT",
      location: "Sector 19A & 40, Nizampur Road, Panipat, Haryana",
      description: "Panipat's first premium integrated township — 125+ acres, 7 chakra-inspired neighbourhoods, 10 theme parks. Plots from ₹2.25 Cr (indicative).",
      status: "ACTIVE",
    }),
  });
  console.log(`Project created: ${project.id}`);
} else {
  console.log(`Project exists: ${project.id}`);
}

// ── 2. Agent config: instructions + sane defaults ──────────────
const instructions = fileBody("instructions.md");
await rest(`ai_agent_configs?on_conflict=company_id`, {
  method: "POST",
  headers: { Prefer: "resolution=merge-duplicates" },
  body: JSON.stringify({
    company_id: company.id,
    persona_name: "Priya",
    persona_role: "sales consultant for Trident Parktown",
    tone: "FRIENDLY",
    languages: "English, Hindi, Hinglish",
    custom_instructions: instructions,
    updated_at: new Date().toISOString(),
  }),
});
console.log(`Config updated (instructions: ${instructions.length} chars)`);

// ── 3. Knowledge docs (replace by title) ───────────────────────
const docs = [
  ["Trident Parktown — project & location", "knowledge-1-project-and-location.md"],
  ["Trident Parktown — neighbourhoods, parks & clubhouse", "knowledge-2-vistas-parks-clubhouse.md"],
  ["Trident Parktown — developer, legal & trust answers", "knowledge-3-developer-legal-trust.md"],
];
for (const [i, [title, file]] of docs.entries()) {
  await rest(`ai_knowledge_docs?company_id=eq.${company.id}&title=eq.${encodeURIComponent(title)}`, {
    method: "DELETE",
  });
  await rest("ai_knowledge_docs", {
    method: "POST",
    body: JSON.stringify({
      company_id: company.id,
      project_id: project.id,
      title,
      content: fileBody(file),
      is_active: true,
      position: i,
    }),
  });
  console.log(`Doc loaded: ${title}`);
}

// ── 4. Facts (wipe project facts, re-import CSV) ───────────────
const csv = Papa.parse(readFileSync(resolve(kbDir, "facts.csv"), "utf8"), {
  header: true,
  skipEmptyLines: true,
});
await rest(`ai_facts?company_id=eq.${company.id}&project_id=eq.${project.id}`, { method: "DELETE" });
const factRows = csv.data
  .filter((r) => r.key?.trim() && r.value?.trim())
  .map((r, i) => ({
    company_id: company.id,
    project_id: project.id,
    category: (r.category || "General").trim(),
    label: r.key.trim(),
    value: r.value.trim(),
    position: i,
  }));
await rest("ai_facts", { method: "POST", body: JSON.stringify(factRows) });
console.log(`Facts imported: ${factRows.length}`);

// ── 5. Qualification rubric (only if none exists) ──────────────
const existing = await rest(`ai_qualification_fields?select=id&company_id=eq.${company.id}&limit=1`);
if (existing.length === 0) {
  const fields = [
    { field_key: "interest_type", label: "Interest type", question_hint: "Are you looking at a plot, an independent floor, group housing or commercial?", input_type: "CHOICE", options: ["Plot", "Independent Floor", "Group Housing", "Commercial"], required: true, position: 0 },
    { field_key: "budget", label: "Budget range", question_hint: "What budget range are you comfortable with?", input_type: "TEXT", options: [], required: true, position: 1 },
    { field_key: "timeline", label: "Purchase timeline", question_hint: "By when are you planning to finalise?", input_type: "TEXT", options: [], required: true, position: 2 },
    { field_key: "purpose", label: "End use or investment", question_hint: "Is this for your own use or as an investment?", input_type: "CHOICE", options: ["Own use", "Investment"], required: false, position: 3 },
  ].map((f) => ({ ...f, company_id: company.id }));
  await rest("ai_qualification_fields", { method: "POST", body: JSON.stringify(fields) });
  console.log(`Qualification fields seeded: ${fields.length}`);
} else {
  console.log("Qualification fields already exist — left untouched");
}

// ── 6. Point "qualified leads move to" at a sensible stage ─────
const stages = await rest(
  `pipeline_stages?select=id,name&company_id=eq.${company.id}&order=stage_order.asc`
);
const qualStage = stages.find((s) => /qualif/i.test(s.name));
if (qualStage) {
  await rest(`ai_agent_configs?company_id=eq.${company.id}`, {
    method: "PATCH",
    body: JSON.stringify({ qualified_stage_id: qualStage.id }),
  });
  console.log(`Qualified stage → "${qualStage.name}"`);
} else {
  console.log(`No stage matching "qualified" found — set it manually in Setup. Stages: ${stages.map((s) => s.name).join(", ")}`);
}

console.log("\nDone. Review everything at /ai-agent — the agent config, docs, facts and rubric are loaded.");
