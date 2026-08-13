import fs from "node:fs";

const files = {
  dashboard: "app/player/page.tsx",
  nav: "components/player/PlayerAreaNavigation.tsx",
  profile: "app/player/profile/page.tsx",
  profileLib: "lib/player/player-profile.ts",
};

const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, fs.readFileSync(file, "utf8")]),
);

const checks = {
  dashboard_duplicate_label_removed:
    !source.dashboard.includes('tracking-[0.24em] text-sky-400">\\n            Кабінет гравця') &&
    source.dashboard.includes("context.display_name"),
  dashboard_profile_quick_access:
    source.dashboard.includes('href="/player/profile"') &&
    source.dashboard.includes("Мій профіль"),
  navigation_profile_route:
    source.nav.includes('href: "/player/profile"') &&
    source.nav.includes('label: "Профіль"'),
  mobile_nav_three_columns:
    source.nav.includes("grid-cols-3"),
  profile_route_exists:
    source.profile.includes("export default function PlayerProfilePage"),
  profile_uses_authenticated_context:
    source.profile.includes("usePlayerSession") &&
    source.profile.includes("context.player?.id"),
  profile_loads_only_own_player_id:
    source.profileLib.includes('.eq("id", playerId)') &&
    source.profileLib.includes(".maybeSingle()"),
  profile_sports_fields:
    source.profileLib.includes("shirt_number") &&
    source.profileLib.includes("position") &&
    source.profileLib.includes("photo_url"),
  profile_account_identifier:
    source.profile.includes("supabase.auth.getUser") &&
    source.profile.includes("user?.email") &&
    source.profile.includes("user?.phone"),
  no_internal_sprint_copy:
    !source.profile.toLowerCase().includes("спринт") &&
    !source.dashboard.toLowerCase().includes("player-area спринт"),
};

const failed = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

console.log(JSON.stringify({
  verification: "Sprint 05.3.6.2 B.6.1.1 + B.6.2 Player Profile Foundation",
  pass: failed.length === 0,
  failed,
  checks,
}, null, 2));

if (failed.length) process.exit(1);
