import { getActiveSessions } from "./actions";
import { SecurityClient } from "./security-client";

export const metadata = {
  title: "Security & Devices | Big Lead CRM",
};

export default async function SecurityPage() {
  const sessions = await getActiveSessions();
  return <SecurityClient sessions={sessions} />;
}
