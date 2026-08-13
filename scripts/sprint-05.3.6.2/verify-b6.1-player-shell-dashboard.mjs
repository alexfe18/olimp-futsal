import fs from "node:fs";

const files = {
  layout: "app/player/layout.tsx",
  dashboard: "app/player/page.tsx",
  nav: "components/player/PlayerAreaNavigation.tsx",
  visibility: "lib/player/training-visibility.ts",
};

const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, fs.readFileSync(file, "utf8")]),
);

const checks = {
  layout_keeps_player_access_gate:
    source.layout.includes("<PlayerAccessGate>") &&
    source.layout.includes("<PlayerAreaNavigation />"),
  shared_navigation_exists:
    source.nav.includes('href: "/player"') &&
    source.nav.includes('href: "/player/trainings"') &&
    source.nav.includes("usePathname") &&
    source.nav.includes("logout"),
  mobile_navigation_foundation:
    source.nav.includes("fixed inset-x-0 bottom-0") &&
    source.nav.includes("md:hidden"),
  dashboard_uses_existing_session:
    source.dashboard.includes("usePlayerSession") &&
    source.dashboard.includes("context.display_name"),
  dashboard_uses_existing_training_visibility:
    source.dashboard.includes("loadPlayerVisibleTrainings") &&
    source.dashboard.includes("formatTrainingDate") &&
    source.dashboard.includes("formatTrainingTime"),
  nearest_training_card:
    source.dashboard.includes("Найближча подія") &&
    source.dashboard.includes("Наступне тренування") &&
    source.dashboard.includes("nearestTraining"),
  dashboard_has_real_empty_state:
    source.dashboard.includes("Опублікованих тренувань поки немає"),
  no_future_sprint_placeholder:
    !source.dashboard.includes("player-area спринт") &&
    !source.dashboard.includes("з’являться тут у наступних"),
  no_broken_future_routes:
    !source.nav.includes("/player/profile") &&
    !source.nav.includes("/player/matches") &&
    !source.nav.includes("/player/calendar"),
  existing_training_visibility_untouched:
    source.visibility.includes('.eq("is_active", true)') &&
    source.visibility.includes('.eq("status", "scheduled")') &&
    source.visibility.includes('.limit(20)'),
};

const failed = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

console.log(JSON.stringify({
  verification: "Sprint 05.3.6.2 B.6.1 Player Shell & Dashboard",
  pass: failed.length === 0,
  failed,
  checks,
}, null, 2));

if (failed.length) process.exit(1);
