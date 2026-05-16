import { getRoutingAgents } from "./actions";
import RoutingClient from "./routing-client";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Routing Settings | RealLeads CRM",
};

export default async function RoutingSettingsPage() {
  const { data: agents, error } = await getRoutingAgents();

  if (error || !agents) {
    if (error === "Unauthorized" || error === "Only admins can manage routing" || error === "Insufficient permissions") {
      redirect("/dashboard");
    }
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground">Error loading routing settings: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <RoutingClient initialAgents={agents} />
    </div>
  );
}
