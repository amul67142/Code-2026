/**
 * Support tickets — server-only helpers shared by the client Support pages and
 * the owner Tickets pages: signed upload links, attaching uploaded files,
 * loading a thread with short-lived file links, and the notification emails.
 */
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/sender";
import { hasMinRole } from "@/lib/permissions";
import { UserRole } from "@/types";
import {
  ALLOWED_MIME,
  MAX_FILES_PER_MESSAGE,
  SUPPORT_BUCKET,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  attachmentKind,
  baseMime,
  formatBytes,
  maxBytesFor,
  ticketRef,
  type AttachmentView,
  type MessageView,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
  type UploadedFile,
} from "@/lib/support/constants";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://www.biglead.site").replace(/\/$/, "");
const LINK_SECONDS = 60 * 60;

/** Admins see every ticket from their company; everyone else sees their own. */
export function canSeeAllTickets(role: string): boolean {
  return hasMinRole(role as UserRole, UserRole.ADMIN);
}

function safeFileName(name: string): string {
  const cleaned = (name || "file").replace(/[^\w.\-]+/g, "_").replace(/_+/g, "_").slice(-80);
  return cleaned || "file";
}

/** Check one file before handing out an upload link. */
export function checkFile(name: string, mime: string, size: number): string | null {
  const m = baseMime(mime);
  if (!ALLOWED_MIME.has(m)) return `${name}: only images (PNG, JPG, WebP, GIF), videos (WebM, MP4, MOV) and PDFs can be attached.`;
  if (!size || size <= 0) return `${name} is empty.`;
  if (size > maxBytesFor(m)) return `${name} is ${formatBytes(size)} — the limit for this kind of file is ${formatBytes(maxBytesFor(m))}.`;
  return null;
}

/**
 * A one-time upload link for a file in this company's folder. The browser
 * uploads straight to storage, so big recordings never pass through our server.
 */
export async function createUploadLink(companyId: string, name: string, mime: string, size: number) {
  const problem = checkFile(name, mime, size);
  if (problem) return { error: problem };
  const path = `${companyId}/${randomUUID()}/${safeFileName(name)}`;
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(SUPPORT_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[support] upload link failed:", error);
    return { error: "Could not prepare the upload. Please try again." };
  }
  return { path: data.path, token: data.token, contentType: baseMime(mime) };
}

/** Validate files the browser says it uploaded: count, type, size, own folder. */
export function checkUploadedFiles(companyId: string, files: UploadedFile[] | undefined): string | null {
  const list = files || [];
  if (list.length > MAX_FILES_PER_MESSAGE) return `Attach at most ${MAX_FILES_PER_MESSAGE} files per message.`;
  for (const f of list) {
    if (!f?.path || !f.path.startsWith(`${companyId}/`) || f.path.includes("..")) return "One of the files could not be verified. Remove it and try again.";
    const problem = checkFile(f.name, f.mime, f.size);
    if (problem) return problem;
  }
  return null;
}

export async function saveAttachments(ticketId: string, messageId: string, files: UploadedFile[] | undefined) {
  const list = files || [];
  if (!list.length) return;
  const admin = createAdminClient();
  const { error } = await admin.from("support_ticket_attachments").insert(
    list.map((f) => ({
      ticket_id: ticketId,
      message_id: messageId,
      storage_path: f.path,
      file_name: f.name.slice(0, 200),
      mime_type: baseMime(f.mime),
      size_bytes: f.size,
      kind: attachmentKind(f.mime),
    }))
  );
  if (error) console.error("[support] saving attachments failed:", error);
}

/** The whole thread, oldest first, with signed links valid for an hour. */
export async function loadThread(ticketId: string, supportName = "BigLead Support"): Promise<MessageView[]> {
  const admin = createAdminClient();
  const [{ data: messages }, { data: files }] = await Promise.all([
    admin
      .from("support_ticket_messages")
      .select("id, author_type, body, created_at, users:author_user_id ( name )")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true }),
    admin
      .from("support_ticket_attachments")
      .select("id, message_id, storage_path, file_name, mime_type, size_bytes, kind")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true }),
  ]);

  const paths = (files || []).map((f) => f.storage_path);
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await admin.storage.from(SUPPORT_BUCKET).createSignedUrls(paths, LINK_SECONDS);
    for (const s of signed || []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }

  const byMessage = new Map<string, AttachmentView[]>();
  for (const f of files || []) {
    const list = byMessage.get(f.message_id) || [];
    list.push({
      id: f.id,
      name: f.file_name,
      mime: f.mime_type,
      size: Number(f.size_bytes),
      kind: f.kind,
      url: urls.get(f.storage_path) || null,
    });
    byMessage.set(f.message_id, list);
  }

  return (messages || []).map((m) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = (m as any).users as { name?: string } | null;
    return {
      id: m.id,
      authorType: m.author_type,
      authorName: m.author_type === "SUPPORT" ? supportName : user?.name || "Customer",
      body: m.body,
      createdAt: m.created_at,
      attachments: byMessage.get(m.id) || [],
    };
  });
}

/** Remove a ticket's files from storage (rows go with the ticket). */
export async function deleteTicketFiles(ticketId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("support_ticket_attachments").select("storage_path").eq("ticket_id", ticketId);
  const paths = (data || []).map((d) => d.storage_path);
  if (paths.length) await admin.storage.from(SUPPORT_BUCKET).remove(paths);
}

// ── Emails ───────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Who at BigLead hears about tickets: SUPPORT_NOTIFY_EMAILS, comma-separated. */
function supportInboxes(): string[] {
  const raw = process.env.SUPPORT_NOTIFY_EMAILS || process.env.ADMIN_EMAILS || "info@biglead.site";
  return raw
    .split(",")
    .map((s) => s.trim().replace(/^"|"$/g, ""))
    .filter((s) => s.includes("@"));
}

function shell(title: string, inner: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">
    <div style="background:#fff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden">
      <div style="padding:20px 28px;border-bottom:1px solid #e4e4e7;font-weight:700;font-size:15px">${esc(title)}</div>
      <div style="padding:24px 28px;font-size:14px;line-height:1.6">${inner}</div>
    </div>
    <p style="text-align:center;font-size:12px;color:#a1a1aa;margin-top:16px">BigLead CRM</p>
  </div>
</body></html>`;
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:4px 12px 4px 0;color:#71717a;white-space:nowrap;vertical-align:top">${esc(label)}</td><td style="padding:4px 0;font-weight:600">${value}</td></tr>`;
}

function quote(body: string): string {
  const text = body.length > 1500 ? `${body.slice(0, 1500)}…` : body;
  return `<div style="margin:16px 0;padding:12px 16px;background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;white-space:pre-wrap">${esc(text)}</div>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:20px 0 0"><a href="${href}" style="display:inline-block;background:#09090b;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">${esc(label)}</a></p>`;
}

export interface TicketEmailInfo {
  ticketId: string;
  number: number;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  companyName: string;
  raisedByName: string;
  raisedByEmail: string;
  raisedByRole: string;
}

/** To BigLead: a client raised a new ticket. */
export async function notifyNewTicket(info: TicketEmailInfo, body: string, fileCount: number) {
  const urgent = info.priority !== "NORMAL" ? `[${info.priority}] ` : "";
  const subject = `${urgent}New ticket ${ticketRef(info.number)} from ${info.companyName}: ${info.subject}`;
  const html = shell(
    `New support ticket ${ticketRef(info.number)}`,
    `<p style="margin:0 0 12px"><strong>${esc(info.companyName)}</strong> raised a ticket.</p>
     <table style="border-collapse:collapse;font-size:14px">
       ${row("Subject", esc(info.subject))}
       ${row("Category", esc(TICKET_CATEGORIES[info.category]))}
       ${row("Urgency", esc(TICKET_PRIORITIES[info.priority]))}
       ${row("Raised by", `${esc(info.raisedByName)} · ${esc(info.raisedByEmail)} · ${esc(info.raisedByRole)}`)}
       ${row("Attachments", fileCount ? `${fileCount} file${fileCount > 1 ? "s" : ""}` : "None")}
     </table>
     ${quote(body)}
     ${button(`${APP_URL}/owner-admin/tickets/${info.ticketId}`, "Open the ticket")}`
  );
  await Promise.all(supportInboxes().map((to) => sendEmail({ to, subject, html }).catch(() => null)));
}

/** To BigLead: the client replied on a ticket. */
export async function notifyClientReply(info: TicketEmailInfo, body: string, fileCount: number) {
  const subject = `Reply on ${ticketRef(info.number)} from ${info.companyName}: ${info.subject}`;
  const html = shell(
    `New reply on ${ticketRef(info.number)}`,
    `<p style="margin:0">${esc(info.raisedByName)} (${esc(info.companyName)}) replied${fileCount ? ` with ${fileCount} file${fileCount > 1 ? "s" : ""}` : ""}.</p>
     ${quote(body)}
     ${button(`${APP_URL}/owner-admin/tickets/${info.ticketId}`, "Open the ticket")}`
  );
  await Promise.all(supportInboxes().map((to) => sendEmail({ to, subject, html }).catch(() => null)));
}

/** To the client: BigLead replied, or changed the status. */
export async function notifyClient(
  to: string,
  info: { ticketId: string; number: number; subject: string; name: string },
  update: { body?: string; status?: TicketStatus }
) {
  const ref = ticketRef(info.number);
  const subject = update.body
    ? `BigLead Support replied to ${ref}: ${info.subject}`
    : `${ref} is now ${TICKET_STATUSES[update.status || "OPEN"].toLowerCase()}: ${info.subject}`;
  const statusLine = update.status
    ? `<p style="margin:0 0 8px">Status: <strong>${esc(TICKET_STATUSES[update.status])}</strong></p>`
    : "";
  const html = shell(
    `Your ticket ${ref}`,
    `<p style="margin:0 0 12px">Hi ${esc(info.name)},</p>
     ${update.body ? `<p style="margin:0">We replied to your ticket <strong>${esc(info.subject)}</strong>:</p>${quote(update.body)}` : ""}
     ${statusLine}
     <p style="margin:0;color:#71717a">You can reply, or add screenshots and recordings, from Support in BigLead.</p>
     ${button(`${APP_URL}/support/${info.ticketId}`, "View the ticket")}`
  );
  await sendEmail({ to, subject, html }).catch(() => null);
}
