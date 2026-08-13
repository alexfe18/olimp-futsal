import fs from "node:fs";

const nav = fs.readFileSync("components/player/PlayerAreaNavigation.tsx", "utf8");
const dashboard = fs.readFileSync("app/player/page.tsx", "utf8");
const calendarPage = fs.readFileSync("app/player/calendar/page.tsx", "utf8");
const calendarLib = fs.readFileSync("lib/player/calendar.ts", "utf8");
const matchesLib = fs.readFileSync("lib/player/matches.ts", "utf8");
const matchesPage = fs.readFileSync("app/player/matches/page.tsx", "utf8");
const matchDetail = fs.readFileSync("app/player/matches/[matchId]/page.tsx", "utf8");

const checks = {
  matches_route_in_navigation:
    nav.includes('href: "/player/matches"') &&
    nav.includes('label: "Матчі"'),
  mobile_nav_five_columns:
    nav.includes("grid-cols-5"),
  player_matches_pages_exist:
    matchesPage.includes("export default function PlayerMatchesPage") &&
    matchDetail.includes("export default function PlayerMatchDetailPage"),
  matches_team_scoped:
    matchesLib.includes('.eq("team_id", teamId)'),
  archived_matches_hidden:
    matchesLib.includes('.eq("is_archived", false)'),
  calendar_combines_training_and_match:
    calendarLib.includes('"training" | "match"') &&
    calendarLib.includes("loadPlayerVisibleMatchesInRange") &&
    calendarLib.includes("loadPlayerUpcomingMatches"),
  match_calendar_destination:
    calendarLib.includes("`/player/matches/${match.id}`"),
  month_title_capitalizes_only_first_character:
    calendarLib.includes("value.charAt(0).toUpperCase() + value.slice(1)"),
  calendar_day_scrolls_to_agenda:
    calendarPage.includes("scrollIntoView") &&
    calendarPage.includes("agendaRef"),
  calendar_event_preview:
    calendarPage.includes("previewEvent") &&
    calendarPage.includes("Відкрити деталі →"),
  desktop_event_tooltip:
    calendarPage.includes("group-hover:block") &&
    calendarPage.includes("group-focus-within:block"),
  mobile_safe_space:
    calendarPage.includes("pb-40"),
  dashboard_matches_quick_action:
    dashboard.includes('href="/player/matches"') &&
    dashboard.includes("Найближчі матчі, суперники"),
};

const failed = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

console.log(JSON.stringify({
  verification: "Sprint 05.3.7 Phase B Player Matches + Calendar Polish",
  pass: failed.length === 0,
  failed,
  checks,
}, null, 2));

if (failed.length) process.exit(1);
