/**
 * Provider-neutral LLM interface.
 *
 * The agent loop in `lib/ai/agent.ts` speaks only these types, so swapping
 * Anthropic ↔ Gemini ↔ test mode is a config change, not a rewrite. Each
 * provider converts these shapes into its own wire format.
 */

export interface ToolDef {
  name: string;
  description: string;
  /** JSON Schema for the tool's input object. */
  schema: Record<string, unknown>;
}

export interface LlmToolCall {
  /** Provider-assigned id (Gemini has none — we synthesise one). */
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface LlmToolResult {
  id: string;
  name: string;
  content: string;
}

export type LlmTurn =
  | { role: "user"; text: string }
  | {
      role: "assistant";
      text: string;
      toolCalls: LlmToolCall[];
      /**
       * Verbatim provider payload for this turn, round-tripped on the next
       * request. Gemini needs it: its parts carry a `thoughtSignature` that
       * must be echoed back or multi-round function calling degrades.
       * Providers ignore metadata they didn't produce.
       */
      providerParts?: unknown;
    }
  | { role: "tool"; results: LlmToolResult[] };

export interface LlmUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export interface LlmResponse {
  text: string;
  toolCalls: LlmToolCall[];
  usage: LlmUsage;
  /** Opaque provider payload to replay on the next turn (see LlmTurn). */
  providerParts?: unknown;
}

export interface LlmRequest {
  model: string;
  /** Large, identical across leads of a company → cached where supported. */
  systemStable: string;
  /** Small, per-lead. Must come after the cache breakpoint. */
  systemVolatile: string;
  turns: LlmTurn[];
  tools: ToolDef[];
}

export interface LlmProvider {
  id: "ANTHROPIC" | "GEMINI" | "MOCK";
  complete(req: LlmRequest): Promise<LlmResponse>;
}

export const EMPTY_USAGE: LlmUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
