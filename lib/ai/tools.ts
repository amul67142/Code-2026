/**
 * AI Agent — tools.
 *
 * Provider-neutral definitions + executors. Executors run under the
 * admin client and write straight into the CRM's existing tables — tasks,
 * pipeline stages, notifications — so a bot action looks exactly like an
 * agent action everywhere else in the app.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { ToolDef } from "./providers/types";
import type { AgentContext } from "./context";

export interface ToolOutcome {
  /** Result text fed back to the model. */
  result: string;
  /** Set when the conversation must stop (opt-out / escalation). */
  stop?: "OPTED_OUT" | "ESCALATED";
  qualified?: boolean;
}

export const AGENT_TOOLS: ToolDef[] = [
  {
    name: "save_qualification",
    description:
      "Record things learned about the lead (rubric fields or anything useful: objections, family needs, current home). Call whenever you learn something new. Merges into what is already known.",
    schema: {
      type: "object",
      properties: {
        fields: {
          type: "object",
          description:
            "Key → value of what was learned, e.g. {\"budget\": \"around 2.5 Cr\", \"timeline\": \"3-6 months\"}",
          additionalProperties: { type: "string" },
        },
        summary: {
          type: "string",
          description: "One-line running summary of this lead's situation.",
        },
      },
      required: ["fields"],
    },
  },
  {
    name: "mark_qualified",
    description:
      "The lead meets every required rubric field and is genuinely interested. Moves them to the qualified pipeline stage and alerts the team.",
    schema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Why they qualify, in one line." },
      },
      required: ["reason"],
    },
  },
  {
    name: "book_site_visit",
    description:
      "The lead agreed to a site visit. Creates a SITE_VISIT task for the sales team with the lead's preferred day and time; the team confirms the exact slot.",
    schema: {
      type: "object",
      properties: {
        preferred_day: {
          type: "string",
          description: "The lead's preferred day, e.g. \"Saturday\", \"tomorrow\", \"26 Aug\".",
        },
        preferred_time: {
          type: "string",
          description: "Preferred time of day, e.g. \"around 11am\", \"evening\".",
        },
        notes: { type: "string", description: "Anything else the team should know." },
      },
      required: ["preferred_day"],
    },
  },
  {
    name: "request_callback",
    description:
      "The lead wants to talk on the phone. Creates a CALL task for the sales team with when suits the lead.",
    schema: {
      type: "object",
      properties: {
        preferred_time: { type: "string", description: "When to call, in the lead's words." },
        topic: { type: "string", description: "What they want to discuss." },
      },
      required: ["preferred_time"],
    },
  },
  {
    name: "escalate_to_human",
    description:
      "Hand this conversation to a human: the lead asked for one, is upset, or needs information you don't have. The bot goes silent on this thread afterwards.",
    schema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Why you're escalating, in one line." },
      },
      required: ["reason"],
    },
  },
  {
    name: "stop_messaging",
    description:
      "The lead asked to stop receiving messages (any phrasing, any language). Permanently opts them out. Use immediately when asked.",
    schema: {
      type: "object",
      properties: {},
    },
  },
];

/** Execute one tool call. Never throws — errors come back as result text. */
export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: AgentContext
): Promise<ToolOutcome> {
  const admin = createAdminClient();
  const companyId = ctx.config.company_id;
  const lead = ctx.lead;

  try {
    switch (name) {
      case "save_qualification": {
        const fields = (input.fields as Record<string, string>) || {};
        const summary = (input.summary as string) || undefined;
        const merged = { ...ctx.profileData, ...fields };
        await admin.from("ai_lead_profiles").upsert(
          {
            company_id: companyId,
            lead_id: lead.id,
            data: merged,
            ...(summary ? { summary } : {}),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "lead_id" }
        );
        ctx.profileData = merged; // keep in-turn state current
        if (summary) ctx.profileSummary = summary;
        return { result: `Saved: ${Object.keys(fields).join(", ") || "nothing new"}.` };
      }

      case "mark_qualified": {
        const reason = (input.reason as string) || "Meets the qualification rubric";
        await admin.from("ai_lead_profiles").upsert(
          {
            company_id: companyId,
            lead_id: lead.id,
            data: ctx.profileData,
            verdict: "QUALIFIED",
            qualified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "lead_id" }
        );
        const stageId = ctx.config.qualified_stage_id;
        if (stageId && stageId !== lead.stage_id) {
          await admin.from("leads").update({ stage_id: stageId }).eq("id", lead.id);
          await admin.from("activities").insert({
            lead_id: lead.id,
            user_id: null,
            type: "STAGE_CHANGE",
            description: `AI agent qualified this lead — ${reason}`,
            metadata: { via: "ai_agent" },
          });
        }
        await notifyTeam(companyId, lead.id, lead.assigned_to_id, {
          title: `🔥 ${lead.name || "A lead"} qualified by the AI agent`,
          message: reason,
        });
        return { result: "Lead marked qualified and the team was alerted.", qualified: true };
      }

      case "book_site_visit": {
        const day = (input.preferred_day as string) || "soon";
        const time = (input.preferred_time as string) || "";
        const notes = (input.notes as string) || "";
        const assignee = await resolveAssignee(companyId, lead.assigned_to_id);
        if (!assignee) return { result: "Could not create the task (no team member found) — reassure the lead the team will confirm, and escalate." };
        await admin.from("tasks").insert({
          lead_id: lead.id,
          company_id: companyId,
          assigned_to_id: assignee,
          created_by_id: assignee,
          type: "SITE_VISIT",
          due_at: tomorrowAt(11),
          notes: `AI agent booked from WhatsApp — preferred: ${day}${time ? `, ${time}` : ""}.${notes ? ` ${notes}` : ""} Confirm the exact slot with the lead.`,
          status: "PENDING",
        });
        await admin.from("activities").insert({
          lead_id: lead.id,
          user_id: null,
          type: "WHATSAPP",
          description: `AI agent booked a site visit (preferred: ${day}${time ? `, ${time}` : ""}).`,
          metadata: { via: "ai_agent" },
        });
        await notifyTeam(companyId, lead.id, assignee, {
          title: `📅 Site visit: ${lead.name || "a lead"}`,
          message: `The AI agent booked a site visit — preferred ${day}${time ? `, ${time}` : ""}. Confirm the slot.`,
        });
        return { result: "Site-visit task created; the team will confirm the exact slot." };
      }

      case "request_callback": {
        const when = (input.preferred_time as string) || "as soon as possible";
        const topic = (input.topic as string) || "";
        const assignee = await resolveAssignee(companyId, lead.assigned_to_id);
        if (!assignee) return { result: "Could not create the task (no team member found) — escalate instead." };
        await admin.from("tasks").insert({
          lead_id: lead.id,
          company_id: companyId,
          assigned_to_id: assignee,
          created_by_id: assignee,
          type: "CALL",
          due_at: nextWorkingHour(),
          notes: `AI agent: lead asked for a callback — ${when}.${topic ? ` Topic: ${topic}` : ""}`,
          status: "PENDING",
        });
        await notifyTeam(companyId, lead.id, assignee, {
          title: `📞 Callback: ${lead.name || "a lead"}`,
          message: `Wants a call ${when}.${topic ? ` Topic: ${topic}` : ""}`,
        });
        return { result: "Callback task created." };
      }

      case "escalate_to_human": {
        const reason = (input.reason as string) || "The AI agent escalated this conversation";
        await admin
          .from("wa_conversations")
          .update({ human_takeover: true, taken_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("company_id", companyId)
          .eq("lead_id", lead.id);
        await notifyTeam(companyId, lead.id, lead.assigned_to_id, {
          title: `🙋 AI handed over: ${lead.name || "a lead"}`,
          message: `${reason} — open Live Chat to continue the conversation.`,
        });
        return {
          result: "Escalated — a human now owns this thread. Tell the lead a teammate will reply shortly, then stop.",
          stop: "ESCALATED",
        };
      }

      case "stop_messaging": {
        await admin
          .from("wa_conversations")
          .update({ opted_out: true, updated_at: new Date().toISOString() })
          .eq("company_id", companyId)
          .eq("lead_id", lead.id);
        await admin.from("activities").insert({
          lead_id: lead.id,
          user_id: null,
          type: "WHATSAPP",
          description: "Lead opted out of WhatsApp messages (via AI agent).",
          metadata: { via: "ai_agent" },
        });
        return {
          result: "Opted out permanently. You may send one short polite goodbye, nothing after.",
          stop: "OPTED_OUT",
        };
      }

      default:
        return { result: `Unknown tool: ${name}` };
    }
  } catch (e) {
    console.error(`AI tool ${name} failed:`, e);
    return { result: `The ${name} action failed — apologise briefly and offer that the team will follow up.` };
  }
}

/** Assigned agent, else any company admin (tasks require a real user id). */
async function resolveAssignee(companyId: string, assignedToId: string | null): Promise<string | null> {
  if (assignedToId) return assignedToId;
  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("id")
    .eq("company_id", companyId)
    .in("role", ["ADMIN", "SUPER_ADMIN"])
    .limit(1)
    .maybeSingle();
  return data?.id || null;
}

async function notifyTeam(
  companyId: string,
  leadId: string,
  userId: string | null,
  n: { title: string; message: string }
) {
  const admin = createAdminClient();
  const target = userId || (await resolveAssignee(companyId, null));
  if (!target) return;
  await admin.from("notifications").insert({
    company_id: companyId,
    user_id: target,
    title: n.title,
    message: n.message,
    type: "AI_AGENT",
    metadata: { lead_id: leadId },
  });
}

function tomorrowAt(hourIst: number): string {
  const now = new Date();
  const d = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  d.setUTCHours(hourIst - 6, 30, 0, 0); // hour IST → UTC (11:00 IST = 05:30 UTC)
  return d.toISOString();
}

function nextWorkingHour(): string {
  return new Date(Date.now() + 60 * 60 * 1000).toISOString();
}
