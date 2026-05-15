/**
 * Permission utilities for role-based access control.
 * Enforces the role hierarchy: SUPER_ADMIN > ADMIN > TEAM_LEAD > AGENT > READ_ONLY
 */

import { UserRole, ROLE_HIERARCHY } from "@/types";

/**
 * Check if the user's role meets the minimum required role.
 * Roles are ordered: READ_ONLY < AGENT < TEAM_LEAD < ADMIN < SUPER_ADMIN
 */
export function hasMinRole(userRole: UserRole, minRole: UserRole): boolean {
  const userLevel = ROLE_HIERARCHY.indexOf(userRole);
  const requiredLevel = ROLE_HIERARCHY.indexOf(minRole);
  return userLevel >= requiredLevel;
}

/**
 * Check if user has one of the specified roles.
 */
export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Check if user can manage (assign/reassign/configure) — requires ADMIN+
 */
export function canManage(role: UserRole): boolean {
  return hasMinRole(role, UserRole.ADMIN);
}

/**
 * Check if user can manage billing — requires SUPER_ADMIN only
 */
export function canManageBilling(role: UserRole): boolean {
  return role === UserRole.SUPER_ADMIN;
}

/**
 * Check if user can view all leads in company (TEAM_LEAD+)
 */
export function canViewAllLeads(role: UserRole): boolean {
  return hasMinRole(role, UserRole.TEAM_LEAD);
}
