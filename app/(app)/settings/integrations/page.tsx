import { getWebhooks } from "./actions";
import { getFacebookConnections } from "./facebook-actions";
import { getWhatsAppConnection, getPipelineStagesForWhatsApp } from "./whatsapp-actions";
import { getProjects } from "../../projects/actions";
import { getAgentsForAssignment } from "../../leads/actions";
import IntegrationsClient from "./integrations-client";

export const metadata = {
  title: "Integrations & Webhooks | Big Lead CRM",
};

export default async function IntegrationsPage() {
  const [webhooks, projects, facebookConnections, agents, whatsappConnection, whatsappStages] =
    await Promise.all([
      getWebhooks(),
      getProjects(),
      getFacebookConnections(),
      getAgentsForAssignment(),
      getWhatsAppConnection(),
      getPipelineStagesForWhatsApp(),
    ]);

  return (
    <IntegrationsClient
      initialWebhooks={webhooks}
      projects={projects}
      facebookConnections={facebookConnections}
      agents={agents}
      whatsappConnection={whatsappConnection}
      whatsappStages={whatsappStages}
    />
  );
}
