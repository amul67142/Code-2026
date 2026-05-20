/**
 * Big Lead CRM — Shared TypeScript Types & Enums
 * All database enums, shared types, and API contracts live here.
 */

// ─── Company ────────────────────────────────────────────────────────────────

export enum Plan {
  STARTER = "STARTER",
  GROWTH = "GROWTH",
  PROFESSIONAL = "PROFESSIONAL",
  ENTERPRISE = "ENTERPRISE",
}

export enum CompanyStatus {
  TRIAL = "TRIAL",
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  CANCELLED = "CANCELLED",
}

// ─── User ───────────────────────────────────────────────────────────────────

export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  TEAM_LEAD = "TEAM_LEAD",
  AGENT = "AGENT",
  READ_ONLY = "READ_ONLY",
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  INVITED = "INVITED",
  INACTIVE = "INACTIVE",
}

/** Role hierarchy — higher index = more permissions */
export const ROLE_HIERARCHY: UserRole[] = [
  UserRole.READ_ONLY,
  UserRole.AGENT,
  UserRole.TEAM_LEAD,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
];

// ─── Project ────────────────────────────────────────────────────────────────

export enum ProjectType {
  APARTMENT = "APARTMENT",
  VILLA = "VILLA",
  PLOT = "PLOT",
  COMMERCIAL = "COMMERCIAL",
  OTHER = "OTHER",
}

export enum ProjectStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

// ─── Lead ───────────────────────────────────────────────────────────────────

export enum LeadSource {
  MANUAL = "MANUAL",
  GOOGLE_ADS = "GOOGLE_ADS",
  FACEBOOK_ADS = "FACEBOOK_ADS",
  WEBSITE_FORM = "WEBSITE_FORM",
  PORTAL_99ACRES = "PORTAL_99ACRES",
  PORTAL_MAGICBRICKS = "PORTAL_MAGICBRICKS",
  PORTAL_HOUSING = "PORTAL_HOUSING",
  WALK_IN = "WALK_IN",
  REFERRAL = "REFERRAL",
  CSV_IMPORT = "CSV_IMPORT",
  OTHER = "OTHER",
}

export enum LeadTimeline {
  IMMEDIATE = "IMMEDIATE",
  THREE_MONTHS = "THREE_MONTHS",
  SIX_MONTHS = "SIX_MONTHS",
  TWELVE_PLUS = "TWELVE_PLUS",
}

export enum LeadStatus {
  ACTIVE = "ACTIVE",
  CLOSED_WON = "CLOSED_WON",
  CLOSED_LOST = "CLOSED_LOST",
}

// ─── Activity ───────────────────────────────────────────────────────────────

export enum ActivityType {
  NOTE = "NOTE",
  CALL = "CALL",
  EMAIL = "EMAIL",
  WHATSAPP = "WHATSAPP",
  STAGE_CHANGE = "STAGE_CHANGE",
  ASSIGNMENT = "ASSIGNMENT",
  TASK_CREATED = "TASK_CREATED",
  TASK_COMPLETED = "TASK_COMPLETED",
  DOCUMENT_UPLOADED = "DOCUMENT_UPLOADED",
  SYSTEM = "SYSTEM",
}

// ─── Task ───────────────────────────────────────────────────────────────────

export enum TaskType {
  CALL = "CALL",
  EMAIL = "EMAIL",
  WHATSAPP = "WHATSAPP",
  SITE_VISIT = "SITE_VISIT",
  OTHER = "OTHER",
}

export enum TaskStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  OVERDUE = "OVERDUE",
  CANCELLED = "CANCELLED",
}

// ─── Webhook ────────────────────────────────────────────────────────────────

export enum AssignmentRule {
  ROUND_ROBIN = "ROUND_ROBIN",
  SPECIFIC_AGENT = "SPECIFIC_AGENT",
  RULE_ENGINE = "RULE_ENGINE",
}

export enum DuplicateRule {
  SKIP = "SKIP",
  CREATE = "CREATE",
  CREATE_AND_FLAG = "CREATE_AND_FLAG",
}

export enum FailureNotify {
  ADMIN = "ADMIN",
  TEAM_LEAD = "TEAM_LEAD",
  BOTH = "BOTH",
  NONE = "NONE",
}

export enum WebhookStatus {
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
}

export enum WebhookLogStatus {
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  DUPLICATE = "DUPLICATE",
  REJECTED = "REJECTED",
  QUEUED = "QUEUED",
}

// ─── Subscription ───────────────────────────────────────────────────────────

export enum SubscriptionStatus {
  ACTIVE = "ACTIVE",
  PAST_DUE = "PAST_DUE",
  CANCELLED = "CANCELLED",
  TRIALING = "TRIALING",
}

// ─── API Response ───────────────────────────────────────────────────────────

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ─── Auth ───────────────────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  authUserId: string;
  companyId: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

// ─── Navigation ─────────────────────────────────────────────────────────────

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
  roles?: UserRole[];
}
