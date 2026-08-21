/**
 * Anthropic provider — the quality default.
 *
 * Uses the official SDK, with a cache_control breakpoint on the stable system
 * block so the (large) knowledge base is served from prompt cache at ~10% of
 * normal input cost on every turn after the first.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { LlmProvider, LlmRequest, LlmResponse, LlmToolCall } from "./types";

/** Models where output_config.effort is supported. */
function effortFor(model: string) {
  return model.includes("opus-5") || model.includes("sonnet-5")
    ? { output_config: { effort: "low" as const } }
    : {};
}

export const anthropicProvider: LlmProvider = {
  id: "ANTHROPIC",

  async complete(req: LlmRequest): Promise<LlmResponse> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    const client = new Anthropic();

    const system: Anthropic.TextBlockParam[] = [
      {
        type: "text",
        text: req.systemStable,
        // 1h TTL: WhatsApp replies arrive with multi-minute gaps, so the
        // default 5-min cache would expire between most turns and every turn
        // would pay the 1.25x cache WRITE instead of the 0.1x read. The same
        // prefix also serves every other lead of this company.
        cache_control: { type: "ephemeral", ttl: "1h" },
      },
      { type: "text", text: req.systemVolatile },
    ];

    const messages: Anthropic.MessageParam[] = req.turns.map((t) => {
      if (t.role === "user") {
        return { role: "user", content: t.text };
      }
      if (t.role === "assistant") {
        const content: Anthropic.ContentBlockParam[] = [];
        if (t.text.trim()) content.push({ type: "text", text: t.text });
        for (const c of t.toolCalls) {
          content.push({ type: "tool_use", id: c.id, name: c.name, input: c.input });
        }
        return { role: "assistant", content };
      }
      return {
        role: "user",
        content: t.results.map((r) => ({
          type: "tool_result" as const,
          tool_use_id: r.id,
          content: r.content,
        })),
      };
    });

    const res = await client.messages.create({
      model: req.model,
      max_tokens: 1024,
      system,
      messages,
      tools: req.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.schema as Anthropic.Tool.InputSchema,
      })),
      ...effortFor(req.model),
    });

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    const toolCalls: LlmToolCall[] = res.content
      .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
      .map((b) => ({ id: b.id, name: b.name, input: b.input as Record<string, unknown> }));

    return {
      text,
      toolCalls,
      usage: {
        input: res.usage.input_tokens,
        output: res.usage.output_tokens,
        cacheRead: res.usage.cache_read_input_tokens || 0,
        cacheWrite: res.usage.cache_creation_input_tokens || 0,
      },
    };
  },
};
