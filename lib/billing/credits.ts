/**
 * Prepaid WhatsApp credits: 1 credit per delivered template.
 *
 * Every business-initiated template a customer sends goes through
 * sendTemplateWithCredit, which HOLDS one credit before the send. The delivery
 * webhook then CHARGES it, a failure REFUNDS it, and a hold with no news in 72
 * hours is refunded by the daily cron. Net effect: they pay only for what was
 * delivered, and a burst of sends can never take the wallet below zero —
 * the hold is taken under a row lock in the database.
 *
 * Session replies inside the 24-hour window (Live Chat, the AI agent) are not
 * templates and cost nothing. The platform company is never charged.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { CREDIT_HOLD_TTL_HOURS, MIN_CREDIT_RECHARGE } from "@/lib/billing/plans";

export class InsufficientCreditsError extends Error {
  constructor() {
    super(
      `Out of WhatsApp credits. Recharge at least ${MIN_CREDIT_RECHARGE} credits in Settings → Billing to send WhatsApp messages.`
    );
    this.name = "InsufficientCreditsError";
  }
}

export async function getCreditBalance(companyId: string): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("credit_wallets")
    .select("balance")
    .eq("company_id", companyId)
    .maybeSingle();
  return data?.balance ?? 0;
}

async function isPlatform(companyId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("companies")
    .select("is_platform")
    .eq("id", companyId)
    .maybeSingle();
  return data?.is_platform === true;
}

/**
 * Send one template, paying for it with a credit.
 *
 * Throws InsufficientCreditsError when the wallet is empty, before anything is
 * sent. Callers already catch send errors and log them, so an empty wallet
 * shows up in the lead timeline and message log as a failed send with the
 * reason, rather than as silence.
 */
export async function sendTemplateWithCredit<T extends { messages?: { id?: string }[] }>(
  companyId: string,
  note: string,
  send: () => Promise<T>
): Promise<T> {
  if (await isPlatform(companyId)) return send();

  const admin = createAdminClient();
  const { data: holdId, error } = await admin.rpc("credit_hold", {
    p_company_id: companyId,
    p_note: note.slice(0, 200),
  });
  if (error) {
    // The wallet could not be read. Refusing is the safe side: sending free
    // would be a silent leak, and this only fails if the database does.
    console.error("sendTemplateWithCredit: hold failed:", error.message);
    throw new Error("Could not check WhatsApp credits. Try again shortly.");
  }
  if (!holdId) throw new InsufficientCreditsError();

  try {
    const res = await send();
    const wamid = res.messages?.[0]?.id;
    if (wamid) {
      // Ties the hold to the delivery report that will settle it.
      await admin.from("credit_ledger").update({ provider_id: wamid }).eq("id", holdId);
    }
    // No wamid: Meta accepted nothing we can track. The 72h sweep refunds it.
    return res;
  } catch (err) {
    await admin.rpc("credit_settle", { p_ledger_id: holdId, p_outcome: "REFUNDED" });
    throw err;
  }
}

/**
 * Settle a held credit from a WhatsApp status report. Idempotent: only a HELD
 * row moves, so Meta re-sending a status cannot charge or refund twice.
 * Messages that were never held (Live Chat, the platform) simply match nothing.
 */
export async function settleCreditForMessage(
  wamid: string,
  status: "delivered" | "read" | "failed"
): Promise<void> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("credit_ledger")
    .select("id")
    .eq("provider_id", wamid)
    .eq("state", "HELD")
    .maybeSingle();
  if (!row) return;
  await admin.rpc("credit_settle", {
    p_ledger_id: row.id,
    p_outcome: status === "failed" ? "REFUNDED" : "CHARGED",
  });
}

/** Refund holds that never got a delivery report. Run daily. */
export async function releaseStaleHolds(): Promise<number> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - CREDIT_HOLD_TTL_HOURS * 3600 * 1000).toISOString();
  const { data: stale } = await admin
    .from("credit_ledger")
    .select("id")
    .eq("state", "HELD")
    .lt("created_at", cutoff)
    .limit(5000);
  let released = 0;
  for (const row of stale || []) {
    const { data } = await admin.rpc("credit_settle", { p_ledger_id: row.id, p_outcome: "REFUNDED" });
    if (data) released++;
  }
  return released;
}
