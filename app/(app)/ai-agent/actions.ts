"use server";

/**
 * AI Agent — server actions for the /ai-agent pages.
 * All admin-gated; reads/writes go through the admin client scoped to the
 * caller's company (the same pattern as the WhatsApp settings actions).
 */
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCachedUserProfile } from "@/lib/auth/cached-user";
import { ALLOWED_MODELS } from "@/lib/ai/providers";

function isAdmin(role?: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

async function requireAdmin() {
  const profile = await getCachedUserProfile();
  if (!profile?.company_id || !isAdmin(profile.role)) return null;
  return profile;
}

// ── Overview ────────────────────────────────────────────────────
export async function getAiOverview() {
  const profile = await requireAdmin();
  if (!profile) return null;
  const admin = createAdminClient();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [cfg, runs24, drafts, qualified30, runs30, escalated] = await Promise.all([
    admin.from("ai_agent_configs").select("*").eq("company_id", profile.company_id).maybeSingle(),
    admin
      .from("ai_runs")
      .select("id", { count: "exact", head: true })
      .eq("company_id", profile.company_id)
      .gte("created_at", since24h),
    admin
      .from("ai_drafts")
      .select("id", { count: "exact", head: true })
      .eq("company_id", profile.company_id)
      .eq("status", "PENDING"),
    admin
      .from("ai_lead_profiles")
      .select("id", { count: "exact", head: true })
      .eq("company_id", profile.company_id)
      .eq("verdict", "QUALIFIED")
      .gte("updated_at", since30d),
    admin
      .from("ai_runs")
      .select("input_tokens, output_tokens, cache_read_tokens, outcome")
      .eq("company_id", profile.company_id)
      .gte("created_at", since30d)
      .limit(2000),
    admin
      .from("wa_conversations")
      .select("id", { count: "exact", head: true })
      .eq("company_id", profile.company_id)
      .eq("human_takeover", true),
  ]);

  const rows = runs30.data || [];
  const totals = rows.reduce(
    (acc, r) => {
      acc.input += r.input_tokens || 0;
      acc.output += r.output_tokens || 0;
      acc.cacheRead += r.cache_read_tokens || 0;
      if (r.outcome === "ERROR") acc.errors += 1;
      return acc;
    },
    { input: 0, output: 0, cacheRead: 0, errors: 0 }
  );

  return {
    config: cfg.data,
    runsToday: runs24.count || 0,
    pendingDrafts: drafts.count || 0,
    qualified30d: qualified30.count || 0,
    escalatedOpen: escalated.count || 0,
    tokens30d: totals,
    runs30d: rows.length,
  };
}

// ── Setup ───────────────────────────────────────────────────────
export async function getAiSetupData() {
  const profile = await requireAdmin();
  if (!profile) return null;
  const admin = createAdminClient();
  const [cfg, stages] = await Promise.all([
    admin.from("ai_agent_configs").select("*").eq("company_id", profile.company_id).maybeSingle(),
    admin
      .from("pipeline_stages")
      .select("id, name, color")
      .eq("company_id", profile.company_id)
      .order("position", { ascending: true }),
  ]);
  return { config: cfg.data, stages: stages.data || [] };
}

export interface AiConfigInput {
  enabled: boolean;
  mode: "SHADOW" | "LIVE";
  provider: "ANTHROPIC" | "GEMINI" | "MOCK";
  model: string;
  persona_name: string;
  persona_role: string;
  tone: "FRIENDLY" | "PROFESSIONAL" | "CASUAL";
  languages: string;
  custom_instructions: string;
  max_turns: number;
  qualified_stage_id: string | null;
}

const ALLOWED_PROVIDERS = new Set(["ANTHROPIC", "GEMINI", "MOCK"]);

export async function saveAiConfig(input: AiConfigInput) {
  const profile = await requireAdmin();
  if (!profile) return { error: "Admin access required" };
  if (!ALLOWED_PROVIDERS.has(input.provider)) return { error: "Unknown provider" };
  if (!ALLOWED_MODELS.has(input.model)) return { error: "Unknown model" };
  if (!input.persona_name.trim()) return { error: "Persona name is required" };

  // Fail loudly here rather than silently producing no replies later.
  if (input.enabled && input.provider === "ANTHROPIC" && !process.env.ANTHROPIC_API_KEY) {
    return { error: "ANTHROPIC_API_KEY is not set in .env.local — add it, or pick Gemini / Test mode." };
  }
  if (input.enabled && input.provider === "GEMINI" && !process.env.GEMINI_API_KEY) {
    return { error: "GEMINI_API_KEY is not set in .env.local — get a free key at aistudio.google.com/apikey." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("ai_agent_configs").upsert(
    {
      company_id: profile.company_id,
      enabled: input.enabled,
      mode: input.mode === "LIVE" ? "LIVE" : "SHADOW",
      provider: input.provider,
      model: input.model,
      persona_name: input.persona_name.trim().slice(0, 60),
      persona_role: input.persona_role.trim().slice(0, 120) || "sales consultant",
      tone: input.tone,
      languages: input.languages.trim().slice(0, 200) || "English, Hindi, Hinglish",
      custom_instructions: input.custom_instructions.trim().slice(0, 12000) || null,
      max_turns: Math.max(5, Math.min(100, Math.round(input.max_turns) || 30)),
      qualified_stage_id: input.qualified_stage_id || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id" }
  );
  if (error) return { error: "Failed to save — check the migration 023 ran." };
  revalidatePath("/ai-agent");
  revalidatePath("/ai-agent/setup");
  return { success: true };
}

// ── Knowledge docs ──────────────────────────────────────────────
export async function getKnowledgeData() {
  const profile = await requireAdmin();
  if (!profile) return null;
  const admin = createAdminClient();
  const [docs, projects] = await Promise.all([
    admin
      .from("ai_knowledge_docs")
      .select("id, title, content, project_id, is_active, position, updated_at")
      .eq("company_id", profile.company_id)
      .order("position", { ascending: true }),
    admin
      .from("projects")
      .select("id, name")
      .eq("company_id", profile.company_id)
      .order("name", { ascending: true }),
  ]);
  return { docs: docs.data || [], projects: projects.data || [] };
}

export async function saveKnowledgeDoc(input: {
  id?: string;
  title: string;
  content: string;
  project_id: string | null;
}) {
  const profile = await requireAdmin();
  if (!profile) return { error: "Admin access required" };
  if (!input.title.trim()) return { error: "Title is required" };
  const admin = createAdminClient();

  const row = {
    company_id: profile.company_id,
    title: input.title.trim().slice(0, 200),
    content: input.content.slice(0, 120_000),
    project_id: input.project_id || null,
    updated_at: new Date().toISOString(),
  };
  const { error } = input.id
    ? await admin.from("ai_knowledge_docs").update(row).eq("id", input.id).eq("company_id", profile.company_id)
    : await admin.from("ai_knowledge_docs").insert(row);
  if (error) return { error: "Failed to save the document" };
  revalidatePath("/ai-agent/knowledge");
  return { success: true };
}

/**
 * Import a public web page (landing page, project page) as a knowledge doc.
 * Server-side fetch → strip scripts/styles/nav → plain text. Unsupervised
 * knowledge: the model reads and interprets it. ALWAYS review the result —
 * scraped pages carry menus and marketing filler the bot shouldn't repeat.
 */
export async function importKnowledgeFromUrl(rawUrl: string, projectId: string | null) {
  const profile = await requireAdmin();
  if (!profile) return { error: "Admin access required" };

  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return { error: "That doesn't look like a valid URL" };
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    return { error: "Only http and https URLs are supported" };
  }
  // Block obvious SSRF targets — this runs on our server.
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    return { error: "That address isn't allowed" };
  }

  let html: string;
  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "BigLeadCRM-KnowledgeImporter/1.0" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { error: `The page returned ${res.status}` };
    const type = res.headers.get("content-type") || "";
    if (!type.includes("html") && !type.includes("text")) {
      return { error: "That link isn't a web page. For PDFs, paste the text in manually." };
    }
    html = await res.text();
  } catch {
    return { error: "Couldn't fetch that page (timeout or blocked)" };
  }

  const text = htmlToText(html);
  if (text.length < 100) {
    return { error: "Almost no text found — the page is probably JavaScript-rendered. Copy the text in manually." };
  }

  const title =
    (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || url.hostname).trim().slice(0, 200);

  const admin = createAdminClient();
  const { error } = await admin.from("ai_knowledge_docs").insert({
    company_id: profile.company_id,
    project_id: projectId || null,
    title: `${title} (imported)`,
    content: text.slice(0, 120_000),
    is_active: false, // OFF until a human reviews it
  });
  if (error) return { error: "Failed to save the imported page" };

  revalidatePath("/ai-agent/knowledge");
  return { success: true, chars: text.length, title };
}

/** Crude but dependency-free HTML → text. */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<(nav|header|footer|form)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|section|li|h[1-6]|tr|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

export async function toggleKnowledgeDoc(id: string, isActive: boolean) {
  const profile = await requireAdmin();
  if (!profile) return { error: "Admin access required" };
  const admin = createAdminClient();
  await admin
    .from("ai_knowledge_docs")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", profile.company_id);
  revalidatePath("/ai-agent/knowledge");
  return { success: true };
}

export async function deleteKnowledgeDoc(id: string) {
  const profile = await requireAdmin();
  if (!profile) return { error: "Admin access required" };
  const admin = createAdminClient();
  await admin.from("ai_knowledge_docs").delete().eq("id", id).eq("company_id", profile.company_id);
  revalidatePath("/ai-agent/knowledge");
  return { success: true };
}

// ── Facts ───────────────────────────────────────────────────────
export async function getFactsData() {
  const profile = await requireAdmin();
  if (!profile) return null;
  const admin = createAdminClient();
  const [facts, projects] = await Promise.all([
    admin
      .from("ai_facts")
      .select("id, category, label, value, project_id, position")
      .eq("company_id", profile.company_id)
      .order("category", { ascending: true })
      .order("position", { ascending: true }),
    admin
      .from("projects")
      .select("id, name")
      .eq("company_id", profile.company_id)
      .order("name", { ascending: true }),
  ]);
  return { facts: facts.data || [], projects: projects.data || [] };
}

export async function saveFact(input: {
  id?: string;
  category: string;
  label: string;
  value: string;
  project_id: string | null;
}) {
  const profile = await requireAdmin();
  if (!profile) return { error: "Admin access required" };
  if (!input.label.trim() || !input.value.trim()) return { error: "Label and value are required" };
  const admin = createAdminClient();
  const row = {
    company_id: profile.company_id,
    category: input.category.trim().slice(0, 60) || "General",
    label: input.label.trim().slice(0, 200),
    value: input.value.trim().slice(0, 1000),
    project_id: input.project_id || null,
    updated_at: new Date().toISOString(),
  };
  const { error } = input.id
    ? await admin.from("ai_facts").update(row).eq("id", input.id).eq("company_id", profile.company_id)
    : await admin.from("ai_facts").insert(row);
  if (error) return { error: "Failed to save the fact" };
  revalidatePath("/ai-agent/facts");
  return { success: true };
}

/**
 * Bulk-import facts from parsed CSV rows (label/value pairs).
 * Supervised knowledge: every row is quoted verbatim and never paraphrased.
 */
export async function importFacts(
  rows: { category?: string; label: string; value: string }[],
  projectId: string | null
) {
  const profile = await requireAdmin();
  if (!profile) return { error: "Admin access required" };
  if (!Array.isArray(rows) || rows.length === 0) return { error: "Nothing to import" };
  if (rows.length > 1000) return { error: "Too many rows (max 1000 per import)" };

  const clean = rows
    .map((r) => ({
      company_id: profile.company_id,
      project_id: projectId || null,
      category: (r.category || "General").toString().trim().slice(0, 60) || "General",
      label: (r.label || "").toString().trim().slice(0, 200),
      value: (r.value || "").toString().trim().slice(0, 1000),
    }))
    .filter((r) => r.label && r.value);

  if (clean.length === 0) return { error: "No rows had both a label and a value" };

  const admin = createAdminClient();
  const { error } = await admin.from("ai_facts").insert(clean);
  if (error) return { error: "Import failed — check migration 023 has run." };

  revalidatePath("/ai-agent/facts");
  return { success: true, imported: clean.length, skipped: rows.length - clean.length };
}

export async function deleteFact(id: string) {
  const profile = await requireAdmin();
  if (!profile) return { error: "Admin access required" };
  const admin = createAdminClient();
  await admin.from("ai_facts").delete().eq("id", id).eq("company_id", profile.company_id);
  revalidatePath("/ai-agent/facts");
  return { success: true };
}

// ── Qualification rubric ────────────────────────────────────────
export async function getRubricData() {
  const profile = await requireAdmin();
  if (!profile) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("ai_qualification_fields")
    .select("id, field_key, label, question_hint, input_type, options, required, position")
    .eq("company_id", profile.company_id)
    .order("position", { ascending: true });
  return { fields: data || [] };
}

export async function saveRubricField(input: {
  id?: string;
  field_key: string;
  label: string;
  question_hint: string;
  input_type: "TEXT" | "CHOICE" | "NUMBER" | "YESNO";
  options: string[];
  required: boolean;
  position: number;
}) {
  const profile = await requireAdmin();
  if (!profile) return { error: "Admin access required" };
  const key = input.field_key.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").slice(0, 60);
  if (!key || !input.label.trim()) return { error: "Key and label are required" };
  const admin = createAdminClient();
  const row = {
    company_id: profile.company_id,
    field_key: key,
    label: input.label.trim().slice(0, 200),
    question_hint: input.question_hint.trim().slice(0, 300) || null,
    input_type: input.input_type,
    options: input.input_type === "CHOICE" ? input.options.map((o) => o.trim()).filter(Boolean).slice(0, 12) : [],
    required: !!input.required,
    position: Math.max(0, Math.round(input.position) || 0),
  };
  const { error } = input.id
    ? await admin.from("ai_qualification_fields").update(row).eq("id", input.id).eq("company_id", profile.company_id)
    : await admin.from("ai_qualification_fields").insert(row);
  if (error) {
    return { error: error.code === "23505" ? "A field with that key already exists" : "Failed to save the field" };
  }
  revalidatePath("/ai-agent/qualification");
  return { success: true };
}

export async function deleteRubricField(id: string) {
  const profile = await requireAdmin();
  if (!profile) return { error: "Admin access required" };
  const admin = createAdminClient();
  await admin.from("ai_qualification_fields").delete().eq("id", id).eq("company_id", profile.company_id);
  revalidatePath("/ai-agent/qualification");
  return { success: true };
}
