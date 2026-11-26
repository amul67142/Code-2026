"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwner } from "@/lib/owner/session";
import {
  TICKET_STATUSES,
  type TicketStatus,
  type UploadedFile,
} from "@/lib/support/constants";
import { checkUploadedFiles, createUploadLink, notifyClient, saveAttachments } from "@/lib/support/server";

async function ticketWithClient(ticketId: string) {
  const admin = createAdminClient();
  const { data: t } = await admin
    .from("support_tickets")
    .select("id, ticket_number, subject, status, company_id, users:created_by ( name, email )")
    .eq("id", ticketId)
    .maybeSingle();
  if (!t) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (t as any).users as { name?: string; email?: string } | null;
  return { ...t, clientName: user?.name || "there", clientEmail: user?.email || null };
}

/** Upload link for a file the owner attaches; stored in the client's folder. */
export async function getOwnerUploadLink(ticketId: string, name: string, mime: string, size: number) {
  if (!(await isOwner())) return { error: "Not signed in." };
  const t = await ticketWithClient(ticketId);
  if (!t) return { error: "Ticket not found." };
  return createUploadLink(t.company_id, name, mime, size);
}

export async function ownerReply(ticketId: string, rawBody: string, files: UploadedFile[], nextStatus?: TicketStatus) {
  if (!(await isOwner())) return { error: "Not signed in." };
  const t = await ticketWithClient(ticketId);
  if (!t) return { error: "Ticket not found." };
  const body = (rawBody || "").trim();
  if (!body && !files.length) return { error: "Write a reply or attach a file." };
  if (body.length > 10000) return { error: "Reply too long." };
  const problem = checkUploadedFiles(t.company_id, files);
  if (problem) return { error: problem };

  const admin = createAdminClient();
  const text = body || "(attached files)";
  const { data: msg, error } = await admin
    .from("support_ticket_messages")
    .insert({ ticket_id: t.id, author_type: "SUPPORT", body: text })
    .select("id")
    .single();
  if (error || !msg) return { error: "Could not save the reply." };
  await saveAttachments(t.id, msg.id, files);

  // Replying to a new ticket moves it to In progress unless a status was picked.
  const status: TicketStatus =
    nextStatus && nextStatus in TICKET_STATUSES ? nextStatus : t.status === "OPEN" ? "IN_PROGRESS" : (t.status as TicketStatus);
  const now = new Date().toISOString();
  await admin
    .from("support_tickets")
    .update({ status, last_message_at: now, last_message_by: "SUPPORT", updated_at: now })
    .eq("id", t.id);

  if (t.clientEmail) {
    await notifyClient(
      t.clientEmail,
      { ticketId: t.id, number: t.ticket_number, subject: t.subject, name: t.clientName },
      { body: text, status: status !== t.status ? status : undefined }
    );
  }
  revalidatePath(`/owner-admin/tickets/${t.id}`);
  revalidatePath("/owner-admin/tickets");
  return { success: true as const };
}

export async function ownerSetStatus(ticketId: string, status: TicketStatus) {
  if (!(await isOwner())) return { error: "Not signed in." };
  if (!(status in TICKET_STATUSES)) return { error: "Unknown status." };
  const t = await ticketWithClient(ticketId);
  if (!t) return { error: "Ticket not found." };
  if (t.status === status) return { success: true as const };
  const admin = createAdminClient();
  await admin.from("support_tickets").update({ status, updated_at: new Date().toISOString() }).eq("id", t.id);
  // Tell the client when their issue is resolved or closed.
  if (t.clientEmail && (status === "RESOLVED" || status === "CLOSED")) {
    await notifyClient(t.clientEmail, { ticketId: t.id, number: t.ticket_number, subject: t.subject, name: t.clientName }, { status });
  }
  revalidatePath(`/owner-admin/tickets/${t.id}`);
  revalidatePath("/owner-admin/tickets");
  return { success: true as const };
}
