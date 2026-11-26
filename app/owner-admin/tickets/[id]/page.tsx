import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwner } from "@/lib/owner/session";
import { loadThread } from "@/lib/support/server";
import { ticketRef } from "@/lib/support/constants";
import { OwnerTicketClient } from "./owner-ticket-client";

export const metadata = {
  title: "Ticket | BigLead Owner",
};

export const dynamic = "force-dynamic";

export default async function OwnerTicketPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isOwner())) return null;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const admin = createAdminClient();
  const { data: t } = await admin
    .from("support_tickets")
    .select("id, ticket_number, subject, category, priority, status, context, created_at, company_id, companies ( name ), users:created_by ( name, email, role )")
    .eq("id", id)
    .maybeSingle();
  if (!t) notFound();
  const messages = await loadThread(t.id, "You (BigLead Support)");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const any = t as any;

  return (
    <OwnerTicketClient
      ticket={{
        id: t.id,
        ref: ticketRef(t.ticket_number),
        subject: t.subject,
        category: t.category,
        priority: t.priority,
        status: t.status,
        createdAt: t.created_at,
        companyId: t.company_id,
        companyName: any.companies?.name || "—",
        clientName: any.users?.name || null,
        clientEmail: any.users?.email || null,
        clientRole: any.users?.role || null,
        context: (t.context || {}) as Record<string, string | number>,
      }}
      messages={messages}
    />
  );
}
