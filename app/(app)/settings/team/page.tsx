import { getTeamMembers } from "./actions";
import TeamClient from "./team-client";

export const metadata = {
  title: "Team Management | Big Lead CRM",
};

export default async function TeamPage() {
  const { team, currentRole } = await getTeamMembers();

  return (
    <div className="max-w-5xl">
      <TeamClient initialTeam={team} currentRole={currentRole} />
    </div>
  );
}
