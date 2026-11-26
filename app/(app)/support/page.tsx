import { redirect } from "next/navigation";
import { getCachedUserProfile } from "@/lib/auth/cached-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { canSeeAllTickets } from "@/lib/support/server";
import type { TicketSummary } from "@/lib/support/constants";
import { SupportClient } from "./support-client";

export const metadata = {
  title: "Support | Big Lead CRM",
};

export const dynamic = "force-dynamic";

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const profile = await getCachedUserProfile();
  if (!profile?.company_id) redirect("/login");
  const { tab } = await searchParams;

  const admin = createAdminClient();
  const seeAll = canSeeAllTickets(profile.role);
  let q = admin
    .from("support_tickets")
    .select("id, ticket_number, subject, category, priority, status, created_at, last_message_at, last_message_by, users:created_by ( name )")
    .eq("company_id", profile.company_id)
    .order("last_message_at", { ascending: false })
    .limit(100);
  if (!seeAll) q = q.eq("created_by", profile.id);
  const { data } = await q;

  const tickets: TicketSummary[] = (data || []).map((t) => ({
    id: t.id,
    number: t.ticket_number,
    subject: t.subject,
    category: t.category,
    priority: t.priority,
    status: t.status,
    createdAt: t.created_at,
    lastMessageAt: t.last_message_at,
    lastMessageBy: t.last_message_by,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createdByName: ((t as any).users as { name?: string } | null)?.name || null,
  }));

  const initialTab = tab === "new" || tab === "tickets" ? tab : "help";
  return <SupportClient tickets={tickets} showAuthor={seeAll} initialTab={initialTab} />;
}
