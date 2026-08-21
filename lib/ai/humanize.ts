/**
 * AI Agent — humanizer.
 *
 * Instant, perfectly-formatted replies are the biggest "it's a bot" tell.
 * This module makes the output read (and arrive) like a person typed it:
 * strips markdown the model may leak, splits long replies into at most two
 * WhatsApp-sized messages, and computes a typing delay scaled to length.
 */

/** Remove markdown artifacts; keep WhatsApp's own *bold* only if intended. */
export function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/\*\*(.+?)\*\*/g, "$1") // **bold** → plain
    .replace(/__(.+?)__/g, "$1")
    .replace(/`{1,3}([^`]*?)`{1,3}/g, "$1") // code ticks
    .replace(/^\s*[-*•]\s+/gm, "") // bullet markers
    .replace(/^\s*\d+\.\s+/gm, "") // numbered lists
    .replace(/\[(.+?)\]\((.+?)\)/g, "$1 $2") // [text](url) → text url
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Split into at most `max` messages on paragraph boundaries. WhatsApp chats
 * are short bursts — one message usually, two at most.
 */
export function splitMessages(text: string, max = 2): string[] {
  const clean = stripMarkdown(text);
  if (clean.length <= 320) return [clean];

  const paras = clean.split(/\n\n+/).filter(Boolean);
  if (paras.length <= 1) return [clean];

  // Greedily pack paragraphs into `max` buckets without breaking sentences.
  const per = Math.ceil(clean.length / max);
  const out: string[] = [];
  let current = "";
  for (const p of paras) {
    if (current && (current.length + p.length > per || out.length === max - 1)) {
      if (out.length < max - 1) {
        out.push(current.trim());
        current = p;
        continue;
      }
    }
    current = current ? `${current}\n\n${p}` : p;
  }
  if (current.trim()) out.push(current.trim());
  return out.slice(0, max);
}

/** Human-plausible typing delay in ms: ~1.5s base + 25ms/char, capped 2–8s. */
export function typingDelayMs(text: string): number {
  const ms = 1500 + text.length * 25;
  return Math.max(2000, Math.min(8000, ms));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
