export const GLOBAL_SYSTEM_ROLE_CODES = [
  "owner",
  "administrator",
  "club_manager",
  "content_manager",
  "statistician",
  "member",
] as const;

export const TEAM_SYSTEM_ROLE_CODES = [
  "head_coach",
  "assistant_coach",
  "team_manager",
  "player",
  "guardian",
] as const;

export type GlobalSystemRoleCode = (typeof GLOBAL_SYSTEM_ROLE_CODES)[number];
export type TeamSystemRoleCode = (typeof TEAM_SYSTEM_ROLE_CODES)[number];
export type SystemRoleCode = GlobalSystemRoleCode | TeamSystemRoleCode;

export type RoleScope = "global" | "team";
export type AccountStatus = "invited" | "active" | "suspended" | "archived";
export type TeamStatus = "active" | "inactive" | "archived";
export type MembershipStatus = "active" | "inactive" | "ended" | "archived";
