import { notFound, redirect } from "next/navigation";
import { getCachedUserProfile } from "@/lib/auth/cached-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { canSeeAllTickets, loadThread } from "@/lib/support/server";
import { ticketRef } from "@/lib/support/constants";
import { TicketThread } from "./ticket-thread";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ticket | Big Lead CRM",
};

export default async function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getCachedUserProfile();
  if (!profile?.company_id) redirect("/login");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const admin = createAdminClient();
  const { data: t } = await admin
    .from("support_tickets")
    .select("id, ticket_number, subject, category, priority, status, company_id, created_by, created_at, users:created_by ( name )")
    .eq("id", id)
    .maybeSingle();
  if (!t || t.company_id !== profile.company_id) notFound();
  if (t.created_by !== profile.id && !canSeeAllTickets(profile.role)) notFound();

  const messages = await loadThread(t.id);
  return (
    <TicketThread
      ticket={{
        id: t.id,
        ref: ticketRef(t.ticket_number),
        subject: t.subject,
        category: t.category,
        priority: t.priority,
        status: t.status,
        createdAt: t.created_at,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createdByName: ((t as any).users as { name?: string } | null)?.name || null,
      }}
      messages={messages}
    />
  );
}
