import { supabase } from "@/lib/supabase";

export type PlayerMatchStatus =
  | "scheduled"
  | "completed"
  | "postponed"
  | "cancelled";

export type PlayerMatchVenueType = "home" | "away" | "neutral";

export type PlayerMatchOpponent = {
  id: string;
  name: string;
  short_name: string | null;
  city: string | null;
  logo_url: string | null;
};

export type PlayerMatchCompetition = {
  id: string;
  name: string;
  short_name: string | null;
  competition_type: string;
  season: string | null;
};

export type PlayerVisibleMatch = {
  id: string;
  team_id: string;
  competition_id: string | null;
  opponent_id: string | null;
  title: string | null;
  starts_at: string | null;
  location: string | null;
  venue_type: PlayerMatchVenueType;
  status: PlayerMatchStatus;
  round_name: string | null;
  olimp_score: number | null;
  opponent_score: number | null;
  is_archived: boolean;
  opponent: PlayerMatchOpponent | null;
  competition: PlayerMatchCompetition | null;
};

export type MatchRange = {
  fromInclusive: string;
  toExclusive: string;
};

type MatchRow = Omit<PlayerVisibleMatch, "opponent" | "competition">;

const MATCH_FIELDS =
  "id,team_id,competition_id,opponent_id,title,starts_at,location,venue_type,status,round_name,olimp_score,opponent_score,is_archived";

const KYIV_TIME_ZONE = "Europe/Kyiv";

async function hydrateMatchReferences(rows: MatchRow[]) {
  const opponentIds = Array.from(
    new Set(
      rows
        .map((row) => row.opponent_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const competitionIds = Array.from(
    new Set(
      rows
        .map((row) => row.competition_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const [opponentsResult, competitionsResult] = await Promise.all([
    opponentIds.length
      ? supabase
          .from("opponents")
          .select("id,name,short_name,city,logo_url")
          .in("id", opponentIds)
      : Promise.resolve({ data: [], error: null }),
    competitionIds.length
      ? supabase
          .from("competitions")
          .select("id,name,short_name,competition_type,season")
          .in("id", competitionIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (opponentsResult.error) {
    throw opponentsResult.error;
  }

  if (competitionsResult.error) {
    throw competitionsResult.error;
  }

  const opponents = new Map(
    ((opponentsResult.data ?? []) as PlayerMatchOpponent[]).map((item) => [
      item.id,
      item,
    ]),
  );

  const competitions = new Map(
    ((competitionsResult.data ?? []) as PlayerMatchCompetition[]).map(
      (item) => [item.id, item],
    ),
  );

  return rows.map<PlayerVisibleMatch>((row) => ({
    ...row,
    opponent: row.opponent_id ? opponents.get(row.opponent_id) ?? null : null,
    competition: row.competition_id
      ? competitions.get(row.competition_id) ?? null
      : null,
  }));
}

export async function loadPlayerVisibleMatches(teamId: string) {
  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_FIELDS)
    .eq("team_id", teamId)
    .eq("is_archived", false)
    .order("starts_at", { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) {
    throw error;
  }

  return hydrateMatchReferences((data ?? []) as MatchRow[]);
}

export async function loadPlayerVisibleMatchesInRange(
  teamId: string,
  range: MatchRange,
) {
  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_FIELDS)
    .eq("team_id", teamId)
    .eq("is_archived", false)
    .not("starts_at", "is", null)
    .gte("starts_at", range.fromInclusive)
    .lt("starts_at", range.toExclusive)
    .order("starts_at", { ascending: true })
    .limit(100);

  if (error) {
    throw error;
  }

  return hydrateMatchReferences((data ?? []) as MatchRow[]);
}

export async function loadPlayerUpcomingMatches(
  teamId: string,
  limit = 20,
) {
  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_FIELDS)
    .eq("team_id", teamId)
    .eq("is_archived", false)
    .eq("status", "scheduled")
    .not("starts_at", "is", null)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  return hydrateMatchReferences((data ?? []) as MatchRow[]);
}

export async function loadPlayerVisibleMatch(
  teamId: string,
  matchId: string,
) {
  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_FIELDS)
    .eq("id", matchId)
    .eq("team_id", teamId)
    .eq("is_archived", false)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const [match] = await hydrateMatchReferences([data as MatchRow]);
  return match ?? null;
}

export function getPlayerMatchTitle(match: PlayerVisibleMatch) {
  const ownTitle = match.title?.trim();

  if (ownTitle) {
    return ownTitle;
  }

  return match.opponent?.name
    ? `Олімп Футзал — ${match.opponent.name}`
    : "Матч Олімп Футзал";
}

export function getPlayerMatchStatusLabel(status: PlayerMatchStatus) {
  if (status === "scheduled") return "Заплановано";
  if (status === "completed") return "Завершено";
  if (status === "postponed") return "Перенесено";
  if (status === "cancelled") return "Скасовано";
  return status;
}

export function getPlayerMatchVenueLabel(venue: PlayerMatchVenueType) {
  if (venue === "home") return "Домашній матч";
  if (venue === "away") return "Виїзний матч";
  return "Нейтральне поле";
}

export function getPlayerMatchResult(match: PlayerVisibleMatch) {
  if (
    match.status !== "completed" ||
    match.olimp_score === null ||
    match.opponent_score === null
  ) {
    return null;
  }

  if (match.olimp_score > match.opponent_score) return "Перемога";
  if (match.olimp_score < match.opponent_score) return "Поразка";
  return "Нічия";
}

export function formatPlayerMatchDate(value: string | null) {
  if (!value) return "Дата уточнюється";

  return new Intl.DateTimeFormat("uk-UA", {
    timeZone: KYIV_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function formatPlayerMatchTime(value: string | null) {
  if (!value) return "Час уточнюється";

  return new Intl.DateTimeFormat("uk-UA", {
    timeZone: KYIV_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
