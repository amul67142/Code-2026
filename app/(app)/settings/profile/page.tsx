import { ProfileClient } from "./profile-client";
import { getMyLeads } from "./actions";

export const metadata = {
  title: "My Profile | RealLeads CRM",
};

export default async function ProfilePage() {
  const myLeads = await getMyLeads();

  return <ProfileClient initialLeads={myLeads} />;
}
