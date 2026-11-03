/**
 * Payment reminders: trial ending, trial ended, renewal due, plan expired.
 *
 * Sent by the daily cron to each workspace owner, on WhatsApp FROM SpaceTrans's
 * own number (companies.is_platform) and by email. A reminder is recorded
 * before it is sent, under a unique key, so two cron runs or a retry can never
 * message the same owner twice about the same date.
 *
 * Platform sends are not charged credits: SpaceTrans is exempt, and these are
 * our messages, not the customer's.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/integrations/crypto";
import { normalizeWhatsAppNumber, sendWhatsAppTemplate } from "@/lib/integrations/whatsapp";
import { sendBillingReminderEmail } from "@/lib/email";
import { getURL } from "@/lib/utils";
import { RENEWAL_GRACE_DAYS, TRIAL_DAYS, inr, monthlyPrice } from "@/lib/billing/plans";

/**
 * The WhatsApp template, as it must be created and approved on the SpaceTrans
 * WhatsApp account. Variables: {{1}} owner name, {{2}} workspace name,
 * {{3}} what is happening, {{4}} payment link. Meta rejects a body that starts
 * or ends with a variable, hence the sign-off.
 */
export const BILLING_REMINDER_TEMPLATE = {
  name: "billing_payment_reminder",
  language: "en_US",
  category: "UTILITY" as const,
  body:
    "Hi {{1}}, this is BigLead about your workspace {{2}}.\n\n" +
    "{{3}}\n\n" +
    "Pay here to keep your leads, WhatsApp and team running: {{4}}\n\n" +
    "Thank you, Team BigLead",
  samples: [
    "Raju",
    "Trident Realty",
    "Your 5-day free trial ends on 12 Nov, 3:00 pm.",
    "https://biglead.site/settings/billing",
  ],
};

type Kind = "TRIAL_1D" | "TRIAL_ENDED" | "RENEW_3D" | "RENEW_DUE";

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

function copy(kind: Kind, endIso: string, seats: number): { headline: string; line: string } {
  const price = inr(monthlyPrice(seats));
  switch (kind) {
    case "TRIAL_1D":
      return {
        headline: "Your free trial ends soon",
        line: `Your ${TRIAL_DAYS}-day free trial ends on ${when(endIso)}. After that your dashboard locks until you pay ${price}/month. New leads will still be saved.`,
      };
    case "TRIAL_ENDED":
      return {
        headline: "Your free trial has ended",
        line: `Your free trial ended on ${day(endIso)}, so your dashboard is locked. New leads are still being saved and are waiting for you. Pay ${price}/month to unlock everything.`,
      };
    case "RENEW_3D":
      return {
        headline: `Your plan renews on ${day(endIso)}`,
        line: `Your BigLead plan (${seats} seats) runs until ${day(endIso)}. Renew for ${price} to keep everything running without a break.`,
      };
    case "RENEW_DUE": {
      const lockIso = new Date(new Date(endIso).getTime() + RENEWAL_GRACE_DAYS * DAY).toISOString();
      return {
        headline: "Your plan has expired",
        line: `Your BigLead plan expired on ${day(endIso)}. Renew for ${price} — your dashboard locks on ${day(lockIso)} if it is not renewed.`,
      };
    }
  }
}

interface Due {
  companyId: string;
  kind: Kind;
  endIso: string;
  seats: number;
}

/** Which reminders are due right now. Tuned for one run a day. */
async function findDue(): Promise<Due[]> {
  const admin = createAdminClient();
  const now = Date.now();
  const { data: subs } = await admin
    .from("subscriptions")
    .select("company_id, status, trial_ends_at, current_period_end, seats, razorpay_sub_id, companies!inner(is_platform, deleted_at)")
    .in("status", ["TRIALING", "ACTIVE"]);

  const due: Due[] = [];
  for (const s of subs || []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const company = s.companies as any;
    if (company?.is_platform || company?.deleted_at) continue;
    const seats = s.seats || 3;

    if (s.status === "TRIALING" && s.trial_ends_at) {
      const left = new Date(s.trial_ends_at).getTime() - now;
      // 36h, not 24h: with one run a day, a 24h window misses any trial that
      // ends just after the run.
      if (left > 0 && left <= 36 * HOUR) due.push({ companyId: s.company_id, kind: "TRIAL_1D", endIso: s.trial_ends_at, seats });
      else if (left <= 0 && left > -7 * DAY) due.push({ companyId: s.company_id, kind: "TRIAL_ENDED", endIso: s.trial_ends_at, seats });
    }

    // Autopay subscriptions renew themselves; "please pay" would confuse them.
    if (s.status === "ACTIVE" && s.current_period_end && !s.razorpay_sub_id) {
      const left = new Date(s.current_period_end).getTime() - now;
      if (left > 0 && left <= 3.5 * DAY) due.push({ companyId: s.company_id, kind: "RENEW_3D", endIso: s.current_period_end, seats });
      else if (left <= 0 && left > -7 * DAY) due.push({ companyId: s.company_id, kind: "RENEW_DUE", endIso: s.current_period_end, seats });
    }
  }
  return due;
}

/** The platform's WhatsApp sender, if it is set up and the template approved. */
async function platformSender(): Promise<
  { phoneNumberId: string; token: string } | { skip: string }
> {
  const admin = createAdminClient();
  const { data: platform } = await admin.from("companies").select("id").eq("is_platform", true).maybeSingle();
  if (!platform) return { skip: "no platform company" };

  const [{ data: conn }, { data: tpl }] = await Promise.all([
    admin
      .from("whatsapp_connections")
      .select("phone_number_id, access_token_enc, status")
      .eq("company_id", platform.id)
      .eq("status", "ACTIVE")
      .maybeSingle(),
    admin
      .from("whatsapp_templates")
      .select("status")
      .eq("company_id", platform.id)
      .eq("name", BILLING_REMINDER_TEMPLATE.name)
      .eq("language", BILLING_REMINDER_TEMPLATE.language)
      .maybeSingle(),
  ]);
  if (!conn) return { skip: "SpaceTrans WhatsApp not connected" };
  if (!tpl) return { skip: `template ${BILLING_REMINDER_TEMPLATE.name} not created` };
  if (tpl.status !== "APPROVED") return { skip: `template ${tpl.status.toLowerCase()}` };
  return { phoneNumberId: conn.phone_number_id, token: decryptToken(conn.access_token_enc) };
}

export async function sendDueReminders(): Promise<{ sent: number; skipped: number; results: string[] }> {
  const admin = createAdminClient();
  const due = await findDue();
  const sender = due.length ? await platformSender() : { skip: "nothing due" };
  const payUrl = `${getURL()}/settings/billing`;
  const results: string[] = [];
  let sent = 0;
  let skipped = 0;

  for (const d of due) {
    // Claim first: the unique key makes a second run skip, not resend.
    const { data: claim, error: claimErr } = await admin
      .from("billing_reminders")
      .insert({ company_id: d.companyId, kind: d.kind, cycle_key: d.endIso })
      .select("id")
      .maybeSingle();
    if (claimErr || !claim) {
      skipped++;
      continue;
    }

    const [{ data: company }, { data: owner }] = await Promise.all([
      admin.from("companies").select("name, billing_email").eq("id", d.companyId).maybeSingle(),
      admin
        .from("users")
        .select("name, email, phone, auth_user_id")
        .eq("company_id", d.companyId)
        .eq("role", "SUPER_ADMIN")
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

    // users.phone is optional; the signup phone on the auth account is not.
    let phone = owner?.phone || null;
    if (!phone && owner?.auth_user_id) {
      const { data: auth } = await admin.auth.admin.getUserById(owner.auth_user_id);
      phone = (auth?.user?.user_metadata?.phone as string | undefined) || null;
    }

    const name = owner?.name || "there";
    const workspace = company?.name && company.name !== "Pending Onboarding" ? company.name : "BigLead";
    const { headline, line } = copy(d.kind, d.endIso, d.seats);

    let whatsapp: string;
    if ("skip" in sender) whatsapp = `SKIPPED: ${sender.skip}`;
    else if (!phone) whatsapp = "SKIPPED: owner has no phone";
    else {
      try {
        await sendWhatsAppTemplate(
          sender.phoneNumberId,
          sender.token,
          normalizeWhatsAppNumber(phone),
          BILLING_REMINDER_TEMPLATE.name,
          BILLING_REMINDER_TEMPLATE.language,
          [
            {
              type: "body",
              parameters: [name, workspace, line, payUrl].map((text) => ({
                type: "text",
                text: text.replace(/\s+/g, " ").trim(),
              })),
            },
          ]
        );
        whatsapp = "SENT";
      } catch (e) {
        whatsapp = `FAILED: ${e instanceof Error ? e.message.slice(0, 200) : "send failed"}`;
      }
    }

    let email: string;
    const to = company?.billing_email || owner?.email;
    if (!to) email = "SKIPPED: no email";
    else {
      const r = await sendBillingReminderEmail(to, name, headline, line, payUrl).catch(() => ({ success: false }));
      email = r.success ? "SENT" : "FAILED";
    }

    await admin.from("billing_reminders").update({ whatsapp, email }).eq("id", claim.id);
    if (whatsapp === "SENT" || email === "SENT") sent++;
    results.push(`${d.kind} ${d.companyId.slice(0, 8)}: wa=${whatsapp} email=${email}`);
  }

  return { sent, skipped, results };
}
