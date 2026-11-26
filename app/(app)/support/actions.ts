"use server";

import { revalidatePath } from "next/cache";
import { getCachedUserProfile } from "@/lib/auth/cached-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  type TicketCategory,
  type TicketPriority,
  type UploadedFile,
} from "@/lib/support/constants";
import {
  canSeeAllTickets,
  checkUploadedFiles,
  createUploadLink,
  notifyClientReply,
  notifyNewTicket,
  saveAttachments,
} from "@/lib/support/server";

async function me() {
  const profile = await getCachedUserProfile();
  if (!profile?.company_id) return null;
  const admin = createAdminClient();
  const [{ data: user }, { data: company }] = await Promise.all([
    admin.from("users").select("id, name, email, role").eq("id", profile.id).maybeSingle(),
    admin.from("companies").select("name").eq("id", profile.company_id).maybeSingle(),
  ]);
  if (!user) return null;
  return { ...user, companyId: profile.company_id as string, companyName: company?.name || "A client" };
}

/** A ticket this user may see and reply to, or null. */
async function ownTicket(ticketId: string, user: NonNullable<Awaited<ReturnType<typeof me>>>) {
  const admin = createAdminClient();
  const { data: t } = await admin
    .from("support_tickets")
    .select("id, ticket_number, subject, category, priority, status, company_id, created_by")
    .eq("id", ticketId)
    .maybeSingle();
  if (!t || t.company_id !== user.companyId) return null;
  if (t.created_by !== user.id && !canSeeAllTickets(user.role)) return null;
  return t;
}

/** Step 1 of attaching a file: a one-time link to upload it straight to storage. */
export async function getSupportUploadLink(name: string, mime: string, size: number) {
  const user = await me();
  if (!user) return { error: "Please sign in again." };
  const rl = rateLimit(`support-upload:${user.id}`, 30, 10 * 60 * 1000);
  if (!rl.ok) return { error: "Too many uploads — wait a few minutes and try again." };
  return createUploadLink(user.companyId, name, mime, size);
}

export async function createSupportTicket(input: {
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  body: string;
  files?: UploadedFile[];
  context?: Record<string, string | number>;
}) {
  const user = await me();
  if (!user) return { error: "Please sign in again." };

  const rl = rateLimit(`support-ticket:${user.companyId}`, 10, 60 * 60 * 1000);
  if (!rl.ok) return { error: "You've raised a lot of tickets in the last hour. Please wait a little, or reply on an open one." };

  const subject = (input.subject || "").trim();
  const body = (input.body || "").trim();
  if (subject.length < 3) return { error: "Add a short subject (at least 3 characters)." };
  if (subject.length > 200) return { error: "Keep the subject under 200 characters." };
  if (body.length < 10) return { error: "Describe the issue in a little more detail." };
  if (body.length > 10000) return { error: "The description is too long (10,000 characters max)." };
  const category = input.category in TICKET_CATEGORIES ? input.category : "OTHER";
  const priority = input.priority in TICKET_PRIORITIES ? input.priority : "NORMAL";
  const fileProblem = checkUploadedFiles(user.companyId, input.files);
  if (fileProblem) return { error: fileProblem };

  // Context is only for debugging: keep a few short string/number fields.
  const context: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(input.context || {}).slice(0, 10)) {
    if (typeof v === "number" || typeof v === "string") context[k.slice(0, 40)] = typeof v === "string" ? v.slice(0, 300) : v;
  }

  const admin = createAdminClient();
  const { data: ticket, error } = await admin
    .from("support_tickets")
    .insert({ company_id: user.companyId, created_by: user.id, subject, category, priority, context })
    .select("id, ticket_number")
    .single();
  if (error || !ticket) {
    console.error("[support] create ticket failed:", error);
    return { error: "Could not raise the ticket. Please try again." };
  }

  const { data: msg, error: msgErr } = await admin
    .from("support_ticket_messages")
    .insert({ ticket_id: ticket.id, author_type: "CLIENT", author_user_id: user.id, body })
    .select("id")
    .single();
  if (msgErr || !msg) {
    await admin.from("support_tickets").delete().eq("id", ticket.id);
    return { error: "Could not raise the ticket. Please try again." };
  }
  await saveAttachments(ticket.id, msg.id, input.files);

  await notifyNewTicket(
    {
      ticketId: ticket.id,
      number: ticket.ticket_number,
      subject,
      category,
      priority,
      companyName: user.companyName,
      raisedByName: user.name,
      raisedByEmail: user.email,
      raisedByRole: user.role,
    },
    body,
    input.files?.length || 0
  ).catch((e) => console.error("[support] notify failed:", e));

  revalidatePath("/support");
  return { success: true as const, ticketId: ticket.id, number: ticket.ticket_number };
}

export async function replyToSupportTicket(ticketId: string, rawBody: string, files?: UploadedFile[]) {
  const user = await me();
  if (!user) return { error: "Please sign in again." };
  const ticket = await ownTicket(ticketId, user);
  if (!ticket) return { error: "Ticket not found." };
  if (ticket.status === "CLOSED") return { error: "This ticket is closed. Raise a new one if you still need help." };

  const rl = rateLimit(`support-reply:${user.id}`, 20, 10 * 60 * 1000);
  if (!rl.ok) return { error: "Too many replies — wait a few minutes." };

  const body = (rawBody || "").trim();
  if (!body && !(files || []).length) return { error: "Write a reply or attach a file." };
  if (body.length > 10000) return { error: "The reply is too long (10,000 characters max)." };
  const fileProblem = checkUploadedFiles(user.companyId, files);
  if (fileProblem) return { error: fileProblem };

  const admin = createAdminClient();
  const text = body || "(attached files)";
  const { data: msg, error } = await admin
    .from("support_ticket_messages")
    .insert({ ticket_id: ticket.id, author_type: "CLIENT", author_user_id: user.id, body: text })
    .select("id")
    .single();
  if (error || !msg) return { error: "Could not send the reply. Please try again." };
  await saveAttachments(ticket.id, msg.id, files);

  const now = new Date().toISOString();
  await admin
    .from("support_tickets")
    // A reply on a resolved ticket means it isn't solved yet: reopen it.
    .update({ last_message_at: now, last_message_by: "CLIENT", updated_at: now, ...(ticket.status === "RESOLVED" ? { status: "OPEN" } : {}) })
    .eq("id", ticket.id);

  await notifyClientReply(
    {
      ticketId: ticket.id,
      number: ticket.ticket_number,
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority,
      companyName: user.companyName,
      raisedByName: user.name,
      raisedByEmail: user.email,
      raisedByRole: user.role,
    },
    text,
    files?.length || 0
  ).catch((e) => console.error("[support] notify failed:", e));

  revalidatePath(`/support/${ticket.id}`);
  revalidatePath("/support");
  return { success: true as const };
}

/** The client marks their own ticket solved, or opens it again. */
export async function setOwnTicketResolved(ticketId: string, resolved: boolean) {
  const user = await me();
  if (!user) return { error: "Please sign in again." };
  const ticket = await ownTicket(ticketId, user);
  if (!ticket) return { error: "Ticket not found." };
  if (ticket.status === "CLOSED") return { error: "This ticket is closed." };
  const admin = createAdminClient();
  await admin
    .from("support_tickets")
    .update({ status: resolved ? "RESOLVED" : "OPEN", updated_at: new Date().toISOString() })
    .eq("id", ticket.id);
  revalidatePath(`/support/${ticket.id}`);
  revalidatePath("/support");
  return { success: true as const };
}
