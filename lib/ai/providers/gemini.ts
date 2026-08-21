/**
 * Google Gemini provider — the free option for testing.
 *
 * Uses the REST API with plain fetch (same house style as
 * lib/integrations/whatsapp.ts) so there's no extra dependency. Get a key at
 * https://aistudio.google.com/apikey — the free tier needs no billing account,
 * but it is rate-limited per minute and per day, so it is for TESTING, not for
 * a production bot answering a client's leads.
 *
 * Env: GEMINI_API_KEY
 */
import type { LlmProvider, LlmRequest, LlmResponse, LlmToolCall } from "./types";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown>; id?: string };
  functionResponse?: { name: string; response: Record<string, unknown>; id?: string };
  /**
   * Opaque reasoning token Gemini attaches to model parts. It MUST be echoed
   * back unchanged on the next request or multi-round function calling
   * degrades — so we round-trip the raw parts rather than rebuilding them.
   */
  thoughtSignature?: string;
}

/**
 * Gemini rejects JSON-Schema keywords it doesn't support (additionalProperties,
 * $schema, …). Keep only the subset it accepts.
 */
function cleanSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(cleanSchema);
  if (!schema || typeof schema !== "object") return schema;
  const allowed = new Set([
    "type",
    "description",
    "properties",
    "required",
    "items",
    "enum",
    "format",
    "nullable",
  ]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(schema as Record<string, unknown>)) {
    if (!allowed.has(k)) continue;
    out[k] = k === "properties" || k === "items" ? cleanSchema(v) : v;
  }
  // Gemini requires an object schema to declare properties.
  if (out.type === "object" && !out.properties) out.properties = {};
  return out;
}

export const geminiProvider: LlmProvider = {
  id: "GEMINI",

  async complete(req: LlmRequest): Promise<LlmResponse> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not set");

    // Gemini has one systemInstruction — concatenate our two blocks. (It has
    // no prompt-cache breakpoint on the free tier, so the whole prefix is
    // re-read every turn. Fine for testing, costly at scale.)
    const systemInstruction = {
      parts: [{ text: `${req.systemStable}\n\n${req.systemVolatile}` }],
    };

    const contents = req.turns.map((t) => {
      if (t.role === "user") {
        return { role: "user", parts: [{ text: t.text }] as GeminiPart[] };
      }
      if (t.role === "assistant") {
        // Replay Gemini's own parts verbatim when we have them — that keeps
        // thoughtSignature and call ids intact.
        if (Array.isArray(t.providerParts) && t.providerParts.length > 0) {
          return { role: "model", parts: t.providerParts as GeminiPart[] };
        }
        const parts: GeminiPart[] = [];
        if (t.text.trim()) parts.push({ text: t.text });
        for (const c of t.toolCalls) {
          parts.push({ functionCall: { name: c.name, args: c.input, id: c.id } });
        }
        // A model turn must have at least one part.
        if (parts.length === 0) parts.push({ text: "" });
        return { role: "model", parts };
      }
      return {
        role: "user",
        parts: t.results.map<GeminiPart>((r) => ({
          functionResponse: {
            name: r.name,
            // Match the call by id when Gemini supplied one.
            ...(r.id.startsWith("gemini-") ? {} : { id: r.id }),
            response: { result: r.content },
          },
        })),
      };
    });

    const body: Record<string, unknown> = {
      systemInstruction,
      contents,
      generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
    };
    if (req.tools.length > 0) {
      body.tools = [
        {
          functionDeclarations: req.tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: cleanSchema(t.schema),
          })),
        },
      ];
    }

    const res = await fetch(
      `${BASE}/models/${encodeURIComponent(req.model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(
        data?.error?.message || `Gemini request failed (${res.status})`
      );
    }

    const parts: GeminiPart[] = data?.candidates?.[0]?.content?.parts || [];
    const text = parts
      .map((p) => p.text || "")
      .join("")
      .trim();

    const toolCalls: LlmToolCall[] = parts
      .filter((p) => p.functionCall)
      .map((p, i) => ({
        // Newer Gemini returns a call id; older versions don't — synthesise one.
        id: p.functionCall!.id || `gemini-${Date.now()}-${i}`,
        name: p.functionCall!.name,
        input: (p.functionCall!.args || {}) as Record<string, unknown>,
      }));

    const um = data?.usageMetadata || {};
    return {
      text,
      toolCalls,
      providerParts: parts,
      usage: {
        input: um.promptTokenCount || 0,
        output: um.candidatesTokenCount || 0,
        cacheRead: um.cachedContentTokenCount || 0,
        cacheWrite: 0,
      },
    };
  },
};
