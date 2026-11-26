/**
 * Support tickets: labels, limits and shared types. Safe on client and server.
 */

export const SUPPORT_BUCKET = "support-attachments";

export const TICKET_CATEGORIES = {
  LEADS: "Leads & integrations",
  WHATSAPP: "WhatsApp",
  BILLING: "Billing & payments",
  TEAM: "Team & access",
  BUG: "Something is broken",
  FEATURE: "Feature request",
  OTHER: "Something else",
} as const;
export type TicketCategory = keyof typeof TICKET_CATEGORIES;

export const TICKET_PRIORITIES = {
  NORMAL: "Normal",
  HIGH: "High — slowing us down",
  URGENT: "Urgent — work has stopped",
} as const;
export type TicketPriority = keyof typeof TICKET_PRIORITIES;

export const TICKET_STATUSES = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
} as const;
export type TicketStatus = keyof typeof TICKET_STATUSES;

/** Files per message, and size caps (the bucket itself allows 50 MB). */
export const MAX_FILES_PER_MESSAGE = 5;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
/** Longest in-browser screen recording, in seconds. */
export const MAX_RECORDING_SECONDS = 180;

export const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "video/webm",
  "video/mp4",
  "video/quicktime",
  "application/pdf",
]);

export type AttachmentKind = "IMAGE" | "VIDEO" | "FILE";

/** "video/webm;codecs=vp9" → "video/webm". */
export function baseMime(mime: string): string {
  return (mime || "").split(";")[0].trim().toLowerCase();
}

export function attachmentKind(mime: string): AttachmentKind {
  const m = baseMime(mime);
  if (m.startsWith("image/")) return "IMAGE";
  if (m.startsWith("video/")) return "VIDEO";
  return "FILE";
}

export function maxBytesFor(mime: string): number {
  const k = attachmentKind(mime);
  return k === "VIDEO" ? MAX_VIDEO_BYTES : k === "IMAGE" ? MAX_IMAGE_BYTES : MAX_FILE_BYTES;
}

export function ticketRef(n: number | string): string {
  return `BL-${n}`;
}

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** An uploaded file, before it is attached to a message. */
export interface UploadedFile {
  path: string;
  name: string;
  mime: string;
  size: number;
}

/** An attachment as the UI shows it, with a short-lived link. */
export interface AttachmentView {
  id: string;
  name: string;
  mime: string;
  size: number;
  kind: AttachmentKind;
  url: string | null;
}

export interface MessageView {
  id: string;
  authorType: "CLIENT" | "SUPPORT";
  authorName: string;
  body: string;
  createdAt: string;
  attachments: AttachmentView[];
}

export interface TicketSummary {
  id: string;
  number: number;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  lastMessageAt: string;
  lastMessageBy: "CLIENT" | "SUPPORT";
  createdByName: string | null;
}
