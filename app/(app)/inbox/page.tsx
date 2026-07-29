import { getConversations } from "./actions";
import { getAgentsForAssignment } from "../leads/actions";
import { getCachedUserProfile } from "@/lib/auth/cached-user";
import InboxClient from "./inbox-client";

export const metadata = {
  title: "Live Chat | Big Lead CRM",
};

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const [{ conversations, isAdmin }, agents, profile] = await Promise.all([
    getConversations(),
    getAgentsForAssignment(),
    getCachedUserProfile(),
  ]);

  return (
    <InboxClient
      initialConversations={conversations}
      agents={agents || []}
      isAdmin={isAdmin}
      companyId={profile?.company_id || ""}
    />
  );
}
