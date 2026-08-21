/**
 * AI Agent — context loader.
 *
 * Gathers everything one agent turn needs: the company's config, knowledge
 * docs, exact facts, qualification rubric, the lead (with the ad-form answers
 * already on the lead row), the learned profile, and the recent WhatsApp
 * transcript. Runs under the admin (service-role) client — the agent is
 * triggered from the webhook, where there is no user session.
 */
import { createAdminClient } from "@/lib/supabase/admin";

export interface AgentConfig {
  id: string;
  company_id: string;
  enabled: boolean;
  mode: "SHADOW" | "LIVE";
  provider: "ANTHROPIC" | "GEMINI" | "MOCK";
  model: string;
  persona_name: string;
  persona_role: string;
  tone: "FRIENDLY" | "PROFESSIONAL" | "CASUAL";
  languages: string;
  custom_instructions: string | null;
  max_turns: number;
  qualified_stage_id: string | null;
}

export interface KnowledgeDoc {
  title: string;
  content: string;
  project_id: string | null;
}

export interface Fact {
  category: string;
  label: string;
  value: string;
  project_id: string | null;
}

export interface RubricField {
  field_key: string;
  label: string;
  question_hint: string | null;
  input_type: "TEXT" | "CHOICE" | "NUMBER" | "YESNO";
  options: string[];
  required: boolean;
}

export interface LeadRow {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  project_id: string | null;
  assigned_to_id: string | null;
  stage_id: string | null;
  source: string | null;
  property_type: string | null;
  bhk_preference: string | null;
  location_preference: string | null;
  budget_min: number | null;
  budget_max: number | null;
  timeline: string | null;
  notes: string | null;
}

export interface TranscriptTurn {
  direction: "INBOUND" | "OUTBOUND";
  body: string;
  source: string | null;
  created_at: string;
}

export interface AgentContext {
  config: AgentConfig;
  companyName: string;
  projectName: string | null;
  docs: KnowledgeDoc[];
  facts: Fact[];
  rubric: RubricField[];
  lead: LeadRow;
  profileData: Record<string, unknown>;
  profileSummary: string | null;
  transcript: TranscriptTurn[];
}

/** Load the agent config for a company (null when none or disabled). */
export async function getAgentConfig(companyId: string): Promise<AgentConfig | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("ai_agent_configs")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();
  return (data as AgentConfig) || null;
}

/**
 * Full context for one turn. Knowledge and facts are scoped: rows tied to the
 * lead's project plus global rows (project_id null). Docs/facts for OTHER
 * projects are excluded so the prompt stays small and on-topic.
 */
export async function loadAgentContext(
  companyId: string,
  leadId: string,
  config: AgentConfig
): Promise<AgentContext | null> {
  const admin = createAdminClient();

  const { data: lead } = await admin
    .from("leads")
    .select(
      "id, name, phone, email, project_id, assigned_to_id, stage_id, source, property_type, bhk_preference, location_preference, budget_min, budget_max, timeline, notes"
    )
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return null;

  const projectScope = (q: ReturnType<typeof admin.from>) => q; // typing helper only

  const [companyRes, projectRes, docsRes, factsRes, rubricRes, profileRes, msgsRes] =
    await Promise.all([
      admin.from("companies").select("name").eq("id", companyId).maybeSingle(),
      lead.project_id
        ? admin.from("projects").select("name").eq("id", lead.project_id).maybeSingle()
        : Promise.resolve({ data: null }),
      admin
        .from("ai_knowledge_docs")
        .select("title, content, project_id")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("position", { ascending: true }),
      admin
        .from("ai_facts")
        .select("category, label, value, project_id")
        .eq("company_id", companyId)
        .order("position", { ascending: true }),
      admin
        .from("ai_qualification_fields")
        .select("field_key, label, question_hint, input_type, options, required")
        .eq("company_id", companyId)
        .order("position", { ascending: true }),
      admin
        .from("ai_lead_profiles")
        .select("data, summary")
        .eq("lead_id", leadId)
        .maybeSingle(),
      admin
        .from("message_log")
        .select("direction, body, subject, source, created_at")
        .eq("company_id", companyId)
        .eq("lead_id", leadId)
        .eq("channel", "WHATSAPP")
        .order("created_at", { ascending: false })
        .limit(40),
    ]);
  void projectScope;

  const inScope = <T extends { project_id: string | null }>(rows: T[] | null): T[] =>
    (rows || []).filter((r) => !r.project_id || r.project_id === lead.project_id);

  // Transcript: reverse to chronological; template sends have no body → use
  // the template name so the model knows what the lead was shown.
  const transcript: TranscriptTurn[] = (msgsRes.data || [])
    .reverse()
    .map((m) => ({
      direction: m.direction as "INBOUND" | "OUTBOUND",
      body: (m.body || m.subject || "").toString(),
      source: (m as { source?: string | null }).source ?? null,
      created_at: m.created_at,
    }))
    .filter((m) => m.body.length > 0);

  return {
    config,
    companyName: companyRes.data?.name || "our team",
    projectName: (projectRes?.data as { name?: string } | null)?.name || null,
    docs: inScope(docsRes.data as KnowledgeDoc[] | null),
    facts: inScope(factsRes.data as Fact[] | null),
    rubric: ((rubricRes.data as RubricField[] | null) || []).map((f) => ({
      ...f,
      options: Array.isArray(f.options) ? f.options : [],
    })),
    lead: lead as LeadRow,
    profileData: (profileRes.data?.data as Record<string, unknown>) || {},
    profileSummary: profileRes.data?.summary || null,
    transcript,
  };
}
