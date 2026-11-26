import { getOwnerDashboardData } from "./actions";
import { OverviewView } from "./OverviewView";

export const metadata = {
  title: "Owner Dashboard | BigLead",
};

// Live billing state for every client — never prerender.
export const dynamic = "force-dynamic";

export default async function OwnerDashboardPage() {
  const data = await getOwnerDashboardData();
  return <OverviewView data={data} />;
}
