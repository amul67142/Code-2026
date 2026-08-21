/**
 * Test-mode provider — no API key, no network, no cost.
 *
 * Produces a plausible canned reply so the whole pipeline (webhook → lead
 * match → conversation state → draft in Live Chat → send) can be exercised
 * for free. It is NOT a language model: it does not read what the lead wrote.
 * Use it to verify plumbing, never to judge conversation quality.
 */
import type { LlmProvider, LlmRequest, LlmResponse } from "./types";

const SCRIPT = [
  "Thanks for getting back! Glad you're interested. May I ask what budget range you're working with?",
  "Got it, thank you. And is this for your own use, or as an investment?",
  "That helps. Would you like to visit the site this weekend? I can block a slot for you.",
  "Perfect — someone from our team will confirm the exact timing with you shortly.",
];

export const mockProvider: LlmProvider = {
  id: "MOCK",

  async complete(req: LlmRequest): Promise<LlmResponse> {
    // Advance through the script based on how many lead messages there are.
    const leadTurns = req.turns.filter((t) => t.role === "user").length;
    const line = SCRIPT[Math.min(Math.max(leadTurns - 1, 0), SCRIPT.length - 1)];
    return {
      text: `${line}\n\n[TEST MODE — canned reply, no AI was called]`,
      toolCalls: [],
      usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    };
  },
};
