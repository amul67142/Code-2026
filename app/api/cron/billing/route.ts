import { NextRequest, NextResponse } from "next/server";
import { sendDueReminders } from "@/lib/billing/reminders";
import { releaseStaleHolds } from "@/lib/billing/credits";
import { reconcilePendingOrders } from "@/lib/billing/fulfil";
import { verifyQStashSignature } from "@/lib/qstash";

/**
 * Billing housekeeping:
 *  1. deliver any paid order we never got a confirmation for
 *  2. refund WhatsApp credits held for messages that never reported back
 *  3. send trial / renewal payment reminders
 *
 * Two callers, either is enough:
 *  - a QStash schedule, hourly (scripts/setup-qstash-schedule.mts), signed with
 *    the QStash signing keys — the same scheduler Prasaar uses;
 *  - Vercel's daily cron (vercel.json), with "Authorization: Bearer CRON_SECRET",
 *    the fallback for when QStash is not set up.
 * Running both is safe: each step does nothing the second time.
 */
export const maxDuration = 60;

async function authorised(request: NextRequest, body: string): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") === `Bearer ${secret}`) return true;
  return verifyQStashSignature(request.headers.get("upstash-signature"), body);
}

async function run(request: NextRequest) {
  // QStash signs the exact body, so read it raw before anything else.
  const body = request.method === "POST" ? await request.text() : "";
  if (!(await authorised(request, body))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const out: Record<string, unknown> = {};
  // Each step is independent: one failing must not stop the others.
  try {
    out.ordersFulfilled = await reconcilePendingOrders();
  } catch (e) {
    out.ordersError = e instanceof Error ? e.message : String(e);
  }
  try {
    out.creditHoldsReleased = await releaseStaleHolds();
  } catch (e) {
    out.creditHoldsError = e instanceof Error ? e.message : String(e);
  }
  try {
    out.reminders = await sendDueReminders();
  } catch (e) {
    out.remindersError = e instanceof Error ? e.message : String(e);
  }

  console.log("cron/billing:", JSON.stringify(out));
  return NextResponse.json(out);
}

export const GET = run; // Vercel cron
export const POST = run; // QStash schedule
