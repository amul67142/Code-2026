"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
  companyName: string;
  companyLogo: string | null;
}

const UserContext = createContext<UserProfile | null>(null);

export function UserProvider({
  user,
  children,
}: {
  user: UserProfile;
  children: ReactNode;
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within <UserProvider>");
  return ctx;
}

/**
 * Role hierarchy: SUPER_ADMIN > ADMIN > TEAM_LEAD > AGENT > READ_ONLY
 * Returns true if the user's role is at or above the required minimum.
 */
const ROLE_LEVEL: Record<string, number> = {
  SUPER_ADMIN: 5,
  ADMIN: 4,
  TEAM_LEAD: 3,
  AGENT: 2,
  READ_ONLY: 1,
};

export function hasMinRole(userRole: string, minRole: string): boolean {
  return (ROLE_LEVEL[userRole] ?? 0) >= (ROLE_LEVEL[minRole] ?? 99);
}

/** Readable labels for roles */
export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  TEAM_LEAD: "Team Lead",
  AGENT: "Agent",
  READ_ONLY: "Read Only",
};
