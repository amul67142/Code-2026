import { getWebhooks } from "./actions";
import { getFacebookConnections } from "./facebook-actions";
import { getWhatsAppConnection, getPipelineStagesForWhatsApp } from "./whatsapp-actions";
import { getWhatsAppTemplates } from "./whatsapp-templates-actions";
import { getWhatsAppAnalytics } from "./whatsapp-analytics-actions";
import { getProjects } from "../../projects/actions";
import { getAgentsForAssignment } from "../../leads/actions";
import IntegrationsClient from "./integrations-client";

export const metadata = {
  title: "Integrations & Webhooks | Big Lead CRM",
};

// Always render per-request (uses auth cookies + live integration state).
export const dynamic = "force-dynamic";

/** One slow/failing integration fetch must never take down the whole page. */
async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (e) {
    // Never swallow Next.js control-flow errors (redirect/notFound/dynamic-usage).
    if (
      e &&
      typeof e === "object" &&
      "digest" in e &&
      typeof (e as { digest?: string }).digest === "string" &&
      (e as { digest: string }).digest.startsWith("NEXT_")
    ) {
      throw e;
    }
    if (e instanceof Error && e.message.includes("Dynamic server usage")) throw e;
    console.error("Integrations page: sub-fetch failed (rendering fallback):", e);
    return fallback;
  }
}

export default async function IntegrationsPage() {
  const [
    webhooks,
    projects,
    facebookConnections,
    agents,
    whatsappConnection,
    whatsappStages,
    whatsappTemplates,
    whatsappAnalytics,
  ] = await Promise.all([
    safe(getWebhooks(), []),
    safe(getProjects(), []),
    safe(getFacebookConnections(), []),
    safe(getAgentsForAssignment(), []),
    safe(getWhatsAppConnection(), null),
    safe(getPipelineStagesForWhatsApp(), []),
    safe(getWhatsAppTemplates(), { templates: [], cooldownRemainingSec: 0, hasWaba: false }),
    safe(getWhatsAppAnalytics(), {
      connected: false,
      sent: 0,
      failed: 0,
      replies: 0,
      replyRatePct: null,
      quality: "UNKNOWN" as const,
      messagingLimit: null,
    }),
  ]);

  return (
    <IntegrationsClient
      initialWebhooks={webhooks}
      projects={projects}
      facebookConnections={facebookConnections}
      agents={agents}
      whatsappConnection={whatsappConnection}
      whatsappStages={whatsappStages}
      whatsappTemplates={whatsappTemplates}
      whatsappAnalytics={whatsappAnalytics}
    />
  );
}
