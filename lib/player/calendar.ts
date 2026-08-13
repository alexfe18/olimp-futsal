import { supabase } from "@/lib/supabase";
import {
  getPlayerMatchTitle,
  loadPlayerUpcomingMatches,
  loadPlayerVisibleMatchesInRange,
  type PlayerVisibleMatch,
} from "@/lib/player/matches";

export type PlayerCalendarEventSourceType = "training" | "match";

export type PlayerCalendarEvent = {
  id: string;
  sourceType: PlayerCalendarEventSourceType;
  sourceId: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  teamId: string | null;
  teamName: string | null;
  status: string;
  typeLabel: string;
  href: string;
  subtitle: string | null;
};

export type PlayerCalendarRange = {
  fromInclusive: string;
  toExclusive: string;
};

type CalendarTrainingRow = {
  id: string;
  title: string;
  starts_at: string;
  location: string | null;
  status: string;
  team_id: string | null;
  team_name: string | null;
};

const CALENDAR_TRAINING_FIELDS =
  "id,title,starts_at,location,status,team_id,team_name";

const KYIV_TIME_ZONE = "Europe/Kyiv";

function mapTrainingToCalendarEvent(
  row: CalendarTrainingRow,
): PlayerCalendarEvent {
  return {
    id: `training:${row.id}`,
    sourceType: "training",
    sourceId: row.id,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: null,
    location: row.location,
    teamId: row.team_id,
    teamName: row.team_name,
    status: row.status,
    typeLabel: "Тренування",
    href: `/player/trainings/${row.id}`,
    subtitle: null,
  };
}

function mapMatchToCalendarEvent(
  match: PlayerVisibleMatch,
): PlayerCalendarEvent | null {
  if (!match.starts_at) {
    return null;
  }

  return {
    id: `match:${match.id}`,
    sourceType: "match",
    sourceId: match.id,
    title: getPlayerMatchTitle(match),
    startsAt: match.starts_at,
    endsAt: null,
    location: match.location,
    teamId: match.team_id,
    teamName: "Олімп Футзал",
    status: match.status,
    typeLabel: "Матч",
    href: `/player/matches/${match.id}`,
    subtitle:
      match.competition?.short_name ??
      match.competition?.name ??
      match.round_name ??
      null,
  };
}

function sortEvents(events: PlayerCalendarEvent[]) {
  return [...events].sort(
    (a, b) =>
      new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}

export function createCalendarMonthQueryRange(
  year: number,
  monthIndex: number,
): PlayerCalendarRange {
  const from = new Date(Date.UTC(year, monthIndex, 1));
  from.setUTCDate(from.getUTCDate() - 2);

  const to = new Date(Date.UTC(year, monthIndex + 1, 1));
  to.setUTCDate(to.getUTCDate() + 2);

  return {
    fromInclusive: from.toISOString(),
    toExclusive: to.toISOString(),
  };
}

export async function loadPlayerCalendarEvents(
  teamId: string,
  range: PlayerCalendarRange,
) {
  const [trainingResult, matches] = await Promise.all([
    supabase
      .from("trainings")
      .select(CALENDAR_TRAINING_FIELDS)
      .eq("team_id", teamId)
      .eq("is_active", true)
      .eq("status", "scheduled")
      .gte("starts_at", range.fromInclusive)
      .lt("starts_at", range.toExclusive)
      .order("starts_at", { ascending: true })
      .limit(100),
    loadPlayerVisibleMatchesInRange(teamId, range),
  ]);

  if (trainingResult.error) {
    throw trainingResult.error;
  }

  const trainingEvents = (
    (trainingResult.data ?? []) as CalendarTrainingRow[]
  ).map(mapTrainingToCalendarEvent);

  const matchEvents = matches
    .map(mapMatchToCalendarEvent)
    .filter((event): event is PlayerCalendarEvent => Boolean(event));

  return sortEvents([...trainingEvents, ...matchEvents]);
}

export async function loadPlayerUpcomingCalendarEvents(
  teamId: string,
  limit = 20,
) {
  const [trainingResult, matches] = await Promise.all([
    supabase
      .from("trainings")
      .select(CALENDAR_TRAINING_FIELDS)
      .eq("team_id", teamId)
      .eq("is_active", true)
      .eq("status", "scheduled")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(limit),
    loadPlayerUpcomingMatches(teamId, limit),
  ]);

  if (trainingResult.error) {
    throw trainingResult.error;
  }

  const trainingEvents = (
    (trainingResult.data ?? []) as CalendarTrainingRow[]
  ).map(mapTrainingToCalendarEvent);

  const matchEvents = matches
    .map(mapMatchToCalendarEvent)
    .filter((event): event is PlayerCalendarEvent => Boolean(event));

  return sortEvents([...trainingEvents, ...matchEvents]).slice(0, limit);
}

export function formatCalendarDateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KYIV_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function formatCalendarDate(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    timeZone: KYIV_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function formatCalendarTime(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    timeZone: KYIV_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatCalendarMonthTitle(year: number, monthIndex: number) {
  const value = new Intl.DateTimeFormat("uk-UA", {
    timeZone: KYIV_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, monthIndex, 15, 12)));

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getCalendarMonthKey(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function createCalendarDateKey(
  year: number,
  monthIndex: number,
  day: number,
) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
