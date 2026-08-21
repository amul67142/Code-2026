/**
 * Provider registry + the per-provider model menus shown in AI Agent → Setup.
 */
import type { LlmProvider } from "./types";
import { anthropicProvider } from "./anthropic";
import { geminiProvider } from "./gemini";
import { mockProvider } from "./mock";

export type ProviderId = "ANTHROPIC" | "GEMINI" | "MOCK";

export function getProvider(id: string): LlmProvider {
  switch (id) {
    case "GEMINI":
      return geminiProvider;
    case "MOCK":
      return mockProvider;
    default:
      return anthropicProvider;
  }
}

export interface ProviderMeta {
  id: ProviderId;
  label: string;
  hint: string;
  envKey: string | null;
  models: { value: string; label: string }[];
}

export const PROVIDERS: ProviderMeta[] = [
  {
    id: "ANTHROPIC",
    label: "Claude (best quality)",
    hint: "Paid, per token. Caches your knowledge base so long chats stay cheap. Use this for real leads.",
    envKey: "ANTHROPIC_API_KEY",
    models: [
      { value: "claude-opus-5", label: "Opus 5 — best" },
      { value: "claude-sonnet-5", label: "Sonnet 5 — balanced" },
      { value: "claude-haiku-4-5", label: "Haiku 4.5 — cheapest" },
    ],
  },
  {
    id: "GEMINI",
    label: "Gemini (free tier)",
    hint: "Free key from aistudio.google.com/apikey — no billing needed. Rate-limited, so it's for testing, not production.",
    envKey: "GEMINI_API_KEY",
    // Verified against the live API 2026-08-21 (older 2.x models now 404).
    models: [
      { value: "gemini-flash-latest", label: "Flash (latest) — free, tracks newest" },
      { value: "gemini-3.7-flash", label: "3.7 Flash — free, pinned" },
      { value: "gemini-3.5-flash-lite", label: "3.5 Flash Lite — lightest limits" },
    ],
  },
  {
    id: "MOCK",
    label: "Test mode (no key, no cost)",
    hint: "Canned replies — no AI is called at all. Tests the whole pipeline for free. Never judge conversation quality from this.",
    envKey: null,
    models: [{ value: "mock", label: "Canned replies" }],
  },
];

export const ALLOWED_MODELS = new Set(
  PROVIDERS.flatMap((p) => p.models.map((m) => m.value))
);

export function defaultModelFor(providerId: string): string {
  return PROVIDERS.find((p) => p.id === providerId)?.models[0]?.value || "claude-opus-5";
}

export * from "./types";
