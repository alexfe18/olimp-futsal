import fs from "node:fs";

const nav = fs.readFileSync("components/player/PlayerAreaNavigation.tsx", "utf8");
const dashboard = fs.readFileSync("app/player/page.tsx", "utf8");
const calendarPage = fs.readFileSync("app/player/calendar/page.tsx", "utf8");
const calendarLib = fs.readFileSync("lib/player/calendar.ts", "utf8");

const checks = {
  calendar_route_in_navigation:
    nav.includes('href: "/player/calendar"') &&
    nav.includes('label: "Календар"'),
  mobile_nav_four_columns:
    nav.includes("grid-cols-4"),
  calendar_page_exists:
    calendarPage.includes("export default function PlayerCalendarPage"),
  month_navigation_present:
    calendarPage.includes("moveMonth(-1)") &&
    calendarPage.includes("moveMonth(1)") &&
    calendarPage.includes("Сьогодні"),
  selected_day_agenda_present:
    calendarPage.includes("Події дня") &&
    calendarPage.includes("selectedEvents"),
  unified_source_projection:
    calendarLib.includes('sourceType: "training"') &&
    calendarLib.includes("sourceId: row.id") &&
    calendarLib.includes("href: `/player/trainings/${row.id}`"),
  calendar_does_not_duplicate_training_rows:
    !calendarLib.includes('.from("calendar_events")') &&
    !calendarLib.includes('.from("events")'),
  same_player_training_visibility_rules:
    calendarLib.includes('.eq("team_id", teamId)') &&
    calendarLib.includes('.eq("is_active", true)') &&
    calendarLib.includes('.eq("status", "scheduled")'),
  dashboard_uses_unified_calendar:
    dashboard.includes("loadPlayerUpcomingCalendarEvents") &&
    dashboard.includes("nearestEvent") &&
    dashboard.includes("Наступна подія"),
  dashboard_calendar_cta:
    dashboard.includes('href="/player/calendar"') &&
    dashboard.includes("Календар →"),
  no_fake_match_route:
    !nav.includes("/player/matches") &&
    !calendarPage.includes("/player/matches"),
};

const failed = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

console.log(JSON.stringify({
  verification: "Sprint 05.3.7 Phase A Player Calendar Foundation",
  pass: failed.length === 0,
  failed,
  checks,
}, null, 2));

if (failed.length) process.exit(1);
