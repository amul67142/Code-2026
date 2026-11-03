import { getTeamMembers } from "./actions";
import { getAgentAlertSetup } from "./alert-actions";
import TeamClient from "./team-client";

export const metadata = {
  title: "Team Management | Big Lead CRM",
};

export default async function TeamPage() {
  const [{ team, currentRole }, alertSetup] = await Promise.all([
    getTeamMembers(),
    getAgentAlertSetup(),
  ]);

  return (
    <div className="max-w-5xl">
      <TeamClient initialTeam={team} currentRole={currentRole} initialAlertSetup={alertSetup} />
    </div>
  );
}
