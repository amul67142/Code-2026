import { getWebhooks } from "./actions";
import { getProjects } from "../../projects/actions";
import IntegrationsClient from "./integrations-client";

export const metadata = {
  title: "Integrations & Webhooks | Big Lead CRM",
};

export default async function IntegrationsPage() {
  const [webhooks, projects] = await Promise.all([
    getWebhooks(),
    getProjects()
  ]);

  // Pass user's company info to construct webhook URLs
  return (
    <IntegrationsClient 
      initialWebhooks={webhooks} 
      projects={projects}
    />
  );
}
