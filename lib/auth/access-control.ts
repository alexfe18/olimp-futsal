import type { PlayerAccessContext } from "@/lib/auth/player-auth";

export type AccessDecision =
  | { allow: true }
  | {
      allow: false;
      redirectTo: "/login" | "/account/change-password" | "/player" | "/admin";
      signOut: boolean;
      reason:
        | "account_unavailable"
        | "password_change_required"
        | "player_access_required"
        | "admin_access_required"
        | "no_club_access";
    };

export function hasActivePlayerAccess(context: PlayerAccessContext) {
  return (
    context.account_status === "active" &&
    !context.must_change_password &&
    context.team?.code === "adult" &&
    context.team?.membership_status === "active" &&
    context.team_roles.includes("player")
  );
}

export function decidePlayerRouteAccess(
  context: PlayerAccessContext,
): AccessDecision {
  if (context.account_status !== "active") {
    return {
      allow: false,
      redirectTo: "/login",
      signOut: true,
      reason: "account_unavailable",
    };
  }

  if (context.must_change_password) {
    return {
      allow: false,
      redirectTo: "/account/change-password",
      signOut: false,
      reason: "password_change_required",
    };
  }

  if (hasActivePlayerAccess(context)) {
    return { allow: true };
  }

  if (context.can_access_admin) {
    return {
      allow: false,
      redirectTo: "/admin",
      signOut: false,
      reason: "player_access_required",
    };
  }

  return {
    allow: false,
    redirectTo: "/login",
    signOut: true,
    reason: "no_club_access",
  };
}

export function decideAdminRouteAccess(
  context: PlayerAccessContext,
): AccessDecision {
  if (context.account_status !== "active") {
    return {
      allow: false,
      redirectTo: "/login",
      signOut: true,
      reason: "account_unavailable",
    };
  }

  if (context.must_change_password) {
    return {
      allow: false,
      redirectTo: "/account/change-password",
      signOut: false,
      reason: "password_change_required",
    };
  }

  if (context.can_access_admin) {
    return { allow: true };
  }

  if (hasActivePlayerAccess(context)) {
    return {
      allow: false,
      redirectTo: "/player",
      signOut: false,
      reason: "admin_access_required",
    };
  }

  return {
    allow: false,
    redirectTo: "/login",
    signOut: true,
    reason: "no_club_access",
  };
}
