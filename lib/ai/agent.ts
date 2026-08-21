/**
 * AI Agent — the turn loop.
 *
 * One inbound message → one call here. Builds the prompt, runs the configured
 * provider with tools until it produces reply text, executes tool calls as
 * they come, and logs usage to ai_runs.
 *
 * Provider-agnostic: everything below speaks the neutral types in
 * `lib/ai/providers/types.ts`, so Claude / Gemini / test mode differ only by
 * a config value. No agent framework — the loop is ~70 lines and every
 * prompt, tool call and response is inspectable in ai_runs.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentContext } from "./context";
import { buildStablePrefix, buildLeadBlock, buildHistoryMessages } from "./prompt";
import { AGENT_TOOLS, executeTool } from "./tools";
import { getProvider } from "./providers";
import type { LlmTurn, LlmToolResult } from "./providers/types";

export interface AgentTurnResult {
  reply: string | null;
  stop?: "OPTED_OUT" | "ESCALATED";
  qualified: boolean;
  toolCalls: { name: string; input: unknown }[];
  error?: string;
}

const MAX_TOOL_ROUNDS = 6;
/**
 * Wall-clock ceiling for one turn. The webhook function dies at 60s
 * (maxDuration) — past this budget we stop looping and ship whatever text we
 * have, so a slow provider degrades to a shorter reply instead of a killed
 * function and a lead who never hears back.
 */
const TURN_BUDGET_MS = 35_000;

export async function runAgentTurn(ctx: AgentContext): Promise<AgentTurnResult> {
  const started = Date.now();
  const providerId = ctx.config.provider || "ANTHROPIC";
  const provider = getProvider(providerId);
  const model = ctx.config.model || "claude-opus-5";

  const systemStable = buildStablePrefix(ctx);
  const systemVolatile = buildLeadBlock(ctx);
  const turns: LlmTurn[] = buildHistoryMessages(ctx).map((m) =>
    m.role === "user"
      ? { role: "user", text: m.content }
      : { role: "assistant", text: m.content, toolCalls: [] }
  );

  const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  const toolCalls: { name: string; input: unknown }[] = [];
  let stop: AgentTurnResult["stop"];
  let qualified = false;
  let replyText: string | null = null;
  let error: string | undefined;
  // The model often writes its reply text in the SAME round as a tool call,
  // then has nothing to add after the tool result. Collect text from every
  // round — using only the final round's (possibly empty) text silently
  // drops the reply exactly when the bot is doing its best work.
  const texts: string[] = [];

  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const res = await provider.complete({
        model,
        systemStable,
        systemVolatile,
        turns,
        tools: AGENT_TOOLS,
      });

      usage.input += res.usage.input;
      usage.output += res.usage.output;
      usage.cacheRead += res.usage.cacheRead;
      usage.cacheWrite += res.usage.cacheWrite;

      const trimmed = (res.text || "").trim();
      if (trimmed && texts[texts.length - 1] !== trimmed) texts.push(trimmed);

      if (res.toolCalls.length === 0) {
        replyText = texts.join("\n\n") || null;
        break;
      }

      // Record the model's turn (with the provider's raw parts, which Gemini
      // requires back verbatim), then run every tool it asked for.
      turns.push({
        role: "assistant",
        text: res.text,
        toolCalls: res.toolCalls,
        providerParts: res.providerParts,
      });

      const results: LlmToolResult[] = [];
      for (const call of res.toolCalls) {
        toolCalls.push({ name: call.name, input: call.input });
        const outcome = await executeTool(call.name, call.input, ctx);
        if (outcome.stop) stop = outcome.stop;
        if (outcome.qualified) qualified = true;
        results.push({ id: call.id, name: call.name, content: outcome.result });
      }
      turns.push({ role: "tool", results });

      // The next round lets the model write its closing line, which exits above.
      // If a terminal tool ran and the model keeps calling tools, the round
      // cap stops it; any text produced so far is still used.
      if (round === MAX_TOOL_ROUNDS || Date.now() - started > TURN_BUDGET_MS) {
        replyText = texts.join("\n\n") || null;
        break;
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    console.error(`AI agent turn failed (${providerId}/${model}):`, error);
  }

  // A terminal action with no closing words would leave the lead hanging.
  if (!replyText && stop === "ESCALATED") {
    replyText = "One moment — I'm connecting you with my senior colleague, they'll assist you right here.";
  }

  // Usage + outcome log (best-effort, never blocks the reply).
  try {
    const admin = createAdminClient();
    await admin.from("ai_runs").insert({
      company_id: ctx.config.company_id,
      lead_id: ctx.lead.id,
      model: `${providerId}:${model}`,
      input_tokens: usage.input,
      output_tokens: usage.output,
      cache_read_tokens: usage.cacheRead,
      cache_write_tokens: usage.cacheWrite,
      latency_ms: Date.now() - started,
      tool_calls: toolCalls,
      outcome: error
        ? "ERROR"
        : replyText
          ? ctx.config.mode === "LIVE"
            ? "SENT"
            : "DRAFTED"
          : "SKIPPED",
      error: error || null,
    });
  } catch (logErr) {
    console.error("ai_runs insert failed (non-fatal):", logErr);
  }

  return { reply: replyText, stop, qualified, toolCalls, error };
}
