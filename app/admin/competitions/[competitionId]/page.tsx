"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Modal from "@/components/ui/Modal";
import MatchDetailsCard, {
  type MatchDetailsData,
} from "@/components/matches/MatchDetailsCard";

type TabKey = "overview" | "standings" | "playoff" | "matches" | "statistics";

type PlayerStatsSortKey =
  | "goal_contributions"
  | "goals"
  | "assists"
  | "mvp"
  | "matches"
  | "yellow_cards";

type CompetitionRow = {
  id: string;
  name: string;
  short_name: string | null;
  competition_type: string;
  season: string | null;
  starts_at: string | null;
  ends_at: string | null;
  final_position: number | null;
  is_active: boolean;
  notes: string | null;
};

type StandingRow = {
  id: string;
  competition_id: string;
  team_name: string;
  logo_url: string | null;
  position: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  points: number;
  form: string[];
  is_olimp: boolean;
  notes: string | null;
};

type PlayoffRow = {
  id: string;
  competition_id: string;
  stage: string;
  sort_order: number;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  winner_team: string | null;
  match_date: string | null;
  location: string | null;
  notes: string | null;
};

type MatchRow = {
  id: string;
  competition_id: string | null;
  opponent_id: string;
  starts_at: string | null;
  match_date: string | null;
  venue_type: "home" | "away" | "neutral";
  status: string;
  round_name: string | null;
  olimp_score: number | null;
  opponent_score: number | null;
  location: string | null;
};

type OpponentRow = {
  id: string;
  name: string;
  city: string | null;
};

type PlayerStatsRow = {
  id: string;
  player_id: string;
  competition_id: string;
  matches_played: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  own_goals: number;
  mvp_awards: number;
};

type PlayerRow = {
  id: string;
  full_name: string;
  display_name: string;
  shirt_number: number | null;
  photo_url: string | null;
};

type MatchPlayerStatsRow = {
  player_id: string;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  own_goals: number;
  is_mvp: boolean;
};

type StandingFormState = {
  id: string | null;
  teamName: string;
  logoUrl: string;
  position: string;
  played: string;
  wins: string;
  draws: string;
  losses: string;
  goalsFor: string;
  goalsAgainst: string;
  points: string;
  form: string;
  isOlimp: boolean;
};

type PlayoffFormState = {
  id: string | null;
  stage: string;
  sortOrder: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  winnerTeam: string;
  matchDate: string;
  location: string;
};

const emptyStandingForm: StandingFormState = {
  id: null,
  teamName: "",
  logoUrl: "",
  position: "1",
  played: "0",
  wins: "0",
  draws: "0",
  losses: "0",
  goalsFor: "0",
  goalsAgainst: "0",
  points: "0",
  form: "",
  isOlimp: false,
};

const emptyPlayoffForm: PlayoffFormState = {
  id: null,
  stage: "",
  sortOrder: "1",
  homeTeam: "Олімп Футзал",
  awayTeam: "",
  homeScore: "",
  awayScore: "",
  winnerTeam: "",
  matchDate: "",
  location: "",
};

const tabLabels: Record<TabKey, string> = {
  overview: "Огляд",
  standings: "Турнірна таблиця",
  playoff: "Плей-оф",
  matches: "Матчі",
  statistics: "Статистика",
};

function parseInteger(value: string, label: string, minimum = 0) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum) {
    throw new Error(`${label}: введіть ціле число не менше ${minimum}.`);
  }
  return parsed;
}

function parseNullableScore(value: string, label: string) {
  if (!value.trim()) return null;
  return parseInteger(value, label, 0);
}

function parseForm(value: string) {
  return value
    .toUpperCase()
    .split(/[\s,;]+/)
    .map((item) => item.trim())
    .filter((item) => ["W", "D", "L"].includes(item))
    .slice(0, 5);
}

function formatDate(dateValue: string | null) {
  if (!dateValue) return null;
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatMatchDate(match: MatchRow) {
  if (match.starts_at) {
    return new Intl.DateTimeFormat("uk-UA", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/Kyiv",
    }).format(new Date(match.starts_at));
  }

  return formatDate(match.match_date) ?? "Дата не вказана";
}

export default function CompetitionDetailsPage() {
  const params = useParams<{ competitionId: string }>();
  const competitionId = params.competitionId;

  const [competition, setCompetition] = useState<CompetitionRow | null>(null);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [playoffMatches, setPlayoffMatches] = useState<PlayoffRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [opponents, setOpponents] = useState<OpponentRow[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStatsRow[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [playerStatsSort, setPlayerStatsSort] =
    useState<PlayerStatsSortKey>("goal_contributions");
  const [standingForm, setStandingForm] = useState(emptyStandingForm);
  const [playoffForm, setPlayoffForm] = useState(emptyPlayoffForm);
  const [isStandingEditorOpen, setIsStandingEditorOpen] = useState(false);
  const [isPlayoffEditorOpen, setIsPlayoffEditorOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const [selectedMatchDetails, setSelectedMatchDetails] =
    useState<MatchDetailsData | null>(null);
  const [isMatchDetailsOpen, setIsMatchDetailsOpen] = useState(false);
  const [isMatchDetailsLoading, setIsMatchDetailsLoading] = useState(false);
  const [matchDetailsError, setMatchDetailsError] = useState("");

  async function loadData(showLoader = false) {
    if (!competitionId) return;
    if (showLoader) setIsLoading(true);

    const [
      { data: competitionData, error: competitionError },
      { data: standingsData, error: standingsError },
      { data: playoffData, error: playoffError },
      { data: matchesData, error: matchesError },
      { data: opponentsData, error: opponentsError },
      { data: statsData, error: statsError },
      { data: playersData, error: playersError },
    ] = await Promise.all([
      supabase
        .from("competitions")
        .select(
          "id, name, short_name, competition_type, season, starts_at, ends_at, final_position, is_active, notes",
        )
        .eq("id", competitionId)
        .single(),
      supabase
        .from("competition_standings")
        .select(
          "id, competition_id, team_name, logo_url, position, played, wins, draws, losses, goals_for, goals_against, points, form, is_olimp, notes",
        )
        .eq("competition_id", competitionId)
        .order("position"),
      supabase
        .from("competition_playoff_matches")
        .select(
          "id, competition_id, stage, sort_order, home_team, away_team, home_score, away_score, winner_team, match_date, location, notes",
        )
        .eq("competition_id", competitionId)
        .order("sort_order"),
      supabase
        .from("matches")
        .select(
          "id, competition_id, opponent_id, starts_at, match_date, venue_type, status, round_name, olimp_score, opponent_score, location",
        )
        .eq("competition_id", competitionId)
        .order("match_date", { ascending: false, nullsFirst: false })
        .order("starts_at", { ascending: false, nullsFirst: false }),
      supabase.from("opponents").select("id, name, city"),
      supabase
        .from("player_competition_stats")
        .select(
          "id, player_id, competition_id, matches_played, goals, assists, yellow_cards, red_cards, own_goals, mvp_awards",
        )
        .eq("competition_id", competitionId),
      supabase
        .from("players")
        .select("id, full_name, display_name, shirt_number, photo_url"),
    ]);

    if (
      competitionError ||
      standingsError ||
      playoffError ||
      matchesError ||
      opponentsError ||
      statsError ||
      playersError
    ) {
      console.error("Competition details loading error:", {
        competitionError,
        standingsError,
        playoffError,
        matchesError,
        opponentsError,
        statsError,
        playersError,
      });
      setMessage("Не вдалося завантажити дані змагання.");
      setMessageType("error");
      setIsLoading(false);
      return;
    }

    setCompetition(competitionData as CompetitionRow);
    setStandings((standingsData ?? []) as StandingRow[]);
    setPlayoffMatches((playoffData ?? []) as PlayoffRow[]);
    setMatches((matchesData ?? []) as MatchRow[]);
    setOpponents((opponentsData ?? []) as OpponentRow[]);
    setPlayerStats((statsData ?? []) as PlayerStatsRow[]);
    setPlayers((playersData ?? []) as PlayerRow[]);
    setIsLoading(false);
  }

  function closeMatchDetails() {
    setIsMatchDetailsOpen(false);
    setMatchDetailsError("");
    setSelectedMatchDetails(null);
  }

  async function openMatchDetails(match: MatchRow) {
    const opponent = opponentById.get(match.opponent_id);

    setIsMatchDetailsOpen(true);
    setIsMatchDetailsLoading(true);
    setMatchDetailsError("");
    setSelectedMatchDetails(null);

    const { data, error } = await supabase
      .from("match_player_stats")
      .select(
        "player_id, goals, assists, yellow_cards, red_cards, own_goals, is_mvp",
      )
      .eq("match_id", match.id);

    if (error) {
      console.error("Match details loading error:", error);
      setMatchDetailsError("Не вдалося завантажити деталі матчу.");
      setIsMatchDetailsLoading(false);
      return;
    }

    const stats = (data ?? []) as MatchPlayerStatsRow[];

    const makeEvents = (selector: (row: MatchPlayerStatsRow) => number) =>
      stats
        .map((row) => ({
          playerId: row.player_id,
          playerName: playerById.get(row.player_id)?.display_name ?? "Гравець",
          value: Number(selector(row) ?? 0),
        }))
        .filter((item) => item.value > 0)
        .sort((first, second) => second.value - first.value);

    const mvpRow = stats.find((row) => row.is_mvp);

    setSelectedMatchDetails({
      matchId: match.id,
      opponentName: opponent?.name ?? "Суперник",
      olimpScore: match.olimp_score,
      opponentScore: match.opponent_score,
      roundName: match.round_name,
      formattedDate: formatMatchDate(match),
      status: match.status,
      scorers: makeEvents((row) => row.goals),
      assistants: makeEvents((row) => row.assists),
      yellowCards: makeEvents((row) => row.yellow_cards),
      redCards: makeEvents((row) => row.red_cards),
      ownGoals: makeEvents((row) => row.own_goals),
      mvpName: mvpRow
        ? (playerById.get(mvpRow.player_id)?.display_name ?? "Гравець")
        : null,
    });

    setIsMatchDetailsLoading(false);
  }

  useEffect(() => {
    void loadData(true);

    const channel = supabase
      .channel(`competition-details-${competitionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "competition_standings",
          filter: `competition_id=eq.${competitionId}`,
        },
        () => void loadData(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "competition_playoff_matches",
          filter: `competition_id=eq.${competitionId}`,
        },
        () => void loadData(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [competitionId]);

  const opponentById = useMemo(
    () => new Map(opponents.map((opponent) => [opponent.id, opponent])),
    [opponents],
  );

  const playerById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );

  const completedMatches = useMemo(
    () =>
      matches.filter(
        (match) =>
          match.status === "completed" &&
          match.olimp_score !== null &&
          match.opponent_score !== null,
      ),
    [matches],
  );

  const overview = useMemo(() => {
    const goalsFor = completedMatches.reduce(
      (total, match) => total + (match.olimp_score ?? 0),
      0,
    );
    const goalsAgainst = completedMatches.reduce(
      (total, match) => total + (match.opponent_score ?? 0),
      0,
    );
    const wins = completedMatches.filter(
      (match) => (match.olimp_score ?? 0) > (match.opponent_score ?? 0),
    ).length;
    const draws = completedMatches.filter(
      (match) => match.olimp_score === match.opponent_score,
    ).length;

    return {
      matches: matches.length,
      wins,
      draws,
      losses: completedMatches.length - wins - draws,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
    };
  }, [completedMatches, matches.length]);

  const sortedPlayerStats = useMemo(() => {
    const valueBySort = (stats: PlayerStatsRow) => {
      switch (playerStatsSort) {
        case "goals":
          return stats.goals;
        case "assists":
          return stats.assists;
        case "mvp":
          return stats.mvp_awards;
        case "matches":
          return stats.matches_played;
        case "yellow_cards":
          return stats.yellow_cards;
        case "goal_contributions":
        default:
          return stats.goals + stats.assists;
      }
    };

    return [...playerStats].sort((a, b) => {
      const primaryDifference = valueBySort(b) - valueBySort(a);

      if (primaryDifference !== 0) {
        return primaryDifference;
      }

      if (b.goals !== a.goals) {
        return b.goals - a.goals;
      }

      if (b.assists !== a.assists) {
        return b.assists - a.assists;
      }

      if (b.mvp_awards !== a.mvp_awards) {
        return b.mvp_awards - a.mvp_awards;
      }

      return (playerById.get(a.player_id)?.display_name ?? "").localeCompare(
        playerById.get(b.player_id)?.display_name ?? "",
        "uk",
      );
    });
  }, [playerById, playerStats, playerStatsSort]);

  const topScorers = useMemo(
    () =>
      [...playerStats]
        .filter((stats) => stats.goals > 0)
        .sort((a, b) => {
          if (b.goals !== a.goals) return b.goals - a.goals;
          if (b.assists !== a.assists) return b.assists - a.assists;
          return b.matches_played - a.matches_played;
        })
        .slice(0, 3),
    [playerStats],
  );

  const topAssistants = useMemo(
    () =>
      [...playerStats]
        .filter((stats) => stats.assists > 0)
        .sort((a, b) => {
          if (b.assists !== a.assists) return b.assists - a.assists;
          if (b.goals !== a.goals) return b.goals - a.goals;
          return b.matches_played - a.matches_played;
        })
        .slice(0, 3),
    [playerStats],
  );

  const topMvpPlayers = useMemo(
    () =>
      [...playerStats]
        .filter((stats) => stats.mvp_awards > 0)
        .sort((a, b) => {
          if (b.mvp_awards !== a.mvp_awards) {
            return b.mvp_awards - a.mvp_awards;
          }

          const firstPoints = a.goals + a.assists;
          const secondPoints = b.goals + b.assists;
          return secondPoints - firstPoints;
        })
        .slice(0, 3),
    [playerStats],
  );

  function openCreateStanding() {
    const nextPosition = standings.length
      ? Math.max(...standings.map((row) => row.position)) + 1
      : 1;

    setStandingForm({
      ...emptyStandingForm,
      position: String(nextPosition),
    });
    setIsStandingEditorOpen(true);
  }

  function openEditStanding(row: StandingRow) {
    setStandingForm({
      id: row.id,
      teamName: row.team_name,
      logoUrl: row.logo_url ?? "",
      position: String(row.position),
      played: String(row.played),
      wins: String(row.wins),
      draws: String(row.draws),
      losses: String(row.losses),
      goalsFor: String(row.goals_for),
      goalsAgainst: String(row.goals_against),
      points: String(row.points),
      form: row.form.join(" "),
      isOlimp: row.is_olimp,
    });
    setIsStandingEditorOpen(true);
  }

  async function saveStanding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!standingForm.teamName.trim()) {
      setMessage("Вкажіть назву команди.");
      setMessageType("error");
      return;
    }

    setIsSaving(true);
    setMessage("");
    setMessageType("");

    try {
      const payload = {
        competition_id: competitionId,
        team_name: standingForm.teamName.trim(),
        logo_url: standingForm.logoUrl.trim() || null,
        position: parseInteger(standingForm.position, "Місце", 1),
        played: parseInteger(standingForm.played, "Матчі"),
        wins: parseInteger(standingForm.wins, "Перемоги"),
        draws: parseInteger(standingForm.draws, "Нічиї"),
        losses: parseInteger(standingForm.losses, "Поразки"),
        goals_for: parseInteger(standingForm.goalsFor, "Забиті голи"),
        goals_against: parseInteger(
          standingForm.goalsAgainst,
          "Пропущені голи",
        ),
        points: parseInteger(standingForm.points, "Очки"),
        form: parseForm(standingForm.form),
        is_olimp: standingForm.isOlimp,
        updated_at: new Date().toISOString(),
      };

      const query = standingForm.id
        ? supabase
            .from("competition_standings")
            .update(payload)
            .eq("id", standingForm.id)
        : supabase.from("competition_standings").insert(payload);

      const { error } = await query;
      if (error) throw error;

      setMessage(
        standingForm.id
          ? "Рядок турнірної таблиці оновлено."
          : "Команду додано до турнірної таблиці.",
      );
      setMessageType("success");
      setStandingForm(emptyStandingForm);
      setIsStandingEditorOpen(false);
      await loadData();
    } catch (error) {
      console.error("Standing saving error:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Не вдалося зберегти турнірну таблицю.",
      );
      setMessageType("error");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteStanding(row: StandingRow) {
    if (!window.confirm(`Видалити команду «${row.team_name}» із таблиці?`))
      return;

    setProcessingId(row.id);
    const { error } = await supabase
      .from("competition_standings")
      .delete()
      .eq("id", row.id);

    if (error) {
      setMessage("Не вдалося видалити команду.");
      setMessageType("error");
    } else {
      setMessage("Команду видалено з таблиці.");
      setMessageType("success");
      await loadData();
    }
    setProcessingId(null);
  }

  function openCreatePlayoff() {
    const nextOrder = playoffMatches.length
      ? Math.max(...playoffMatches.map((row) => row.sort_order)) + 1
      : 1;

    setPlayoffForm({
      ...emptyPlayoffForm,
      sortOrder: String(nextOrder),
    });
    setIsPlayoffEditorOpen(true);
  }

  function openEditPlayoff(row: PlayoffRow) {
    setPlayoffForm({
      id: row.id,
      stage: row.stage,
      sortOrder: String(row.sort_order),
      homeTeam: row.home_team,
      awayTeam: row.away_team,
      homeScore: row.home_score !== null ? String(row.home_score) : "",
      awayScore: row.away_score !== null ? String(row.away_score) : "",
      winnerTeam: row.winner_team ?? "",
      matchDate: row.match_date ?? "",
      location: row.location ?? "",
    });
    setIsPlayoffEditorOpen(true);
  }

  async function savePlayoff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !playoffForm.stage.trim() ||
      !playoffForm.homeTeam.trim() ||
      !playoffForm.awayTeam.trim()
    ) {
      setMessage("Заповніть етап і назви обох команд.");
      setMessageType("error");
      return;
    }

    setIsSaving(true);
    setMessage("");
    setMessageType("");

    try {
      const payload = {
        competition_id: competitionId,
        stage: playoffForm.stage.trim(),
        sort_order: parseInteger(playoffForm.sortOrder, "Порядок"),
        home_team: playoffForm.homeTeam.trim(),
        away_team: playoffForm.awayTeam.trim(),
        home_score: parseNullableScore(playoffForm.homeScore, "Голи команди 1"),
        away_score: parseNullableScore(playoffForm.awayScore, "Голи команди 2"),
        winner_team: playoffForm.winnerTeam.trim() || null,
        match_date: playoffForm.matchDate || null,
        location: playoffForm.location.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const query = playoffForm.id
        ? supabase
            .from("competition_playoff_matches")
            .update(payload)
            .eq("id", playoffForm.id)
        : supabase.from("competition_playoff_matches").insert(payload);

      const { error } = await query;
      if (error) throw error;

      setMessage(
        playoffForm.id ? "Матч плей-оф оновлено." : "Матч плей-оф додано.",
      );
      setMessageType("success");
      setPlayoffForm(emptyPlayoffForm);
      setIsPlayoffEditorOpen(false);
      await loadData();
    } catch (error) {
      console.error("Playoff saving error:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Не вдалося зберегти матч плей-оф.",
      );
      setMessageType("error");
    } finally {
      setIsSaving(false);
    }
  }

  async function deletePlayoff(row: PlayoffRow) {
    if (!window.confirm(`Видалити матч «${row.stage}»?`)) return;

    setProcessingId(row.id);
    const { error } = await supabase
      .from("competition_playoff_matches")
      .delete()
      .eq("id", row.id);

    if (error) {
      setMessage("Не вдалося видалити матч плей-оф.");
      setMessageType("error");
    } else {
      setMessage("Матч плей-оф видалено.");
      setMessageType("success");
      await loadData();
    }
    setProcessingId(null);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="font-black uppercase tracking-[0.2em] text-sky-700">
          Завантаження змагання...
        </p>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
        <h1 className="text-2xl font-black text-red-900">
          Змагання не знайдено
        </h1>
        <Link
          href="/admin/competitions"
          className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 font-black text-white"
        >
          ← До списку змагань
        </Link>
      </div>
    );
  }

  return (
    <div>
      <header className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl sm:p-8">
        <Link
          href="/admin/competitions"
          className="text-sm font-bold text-sky-400"
        >
          ← Усі змагання
        </Link>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.25em] text-sky-400">
          {competition.is_active ? "Активне змагання" : "Архівний сезон"}
        </p>
        <h1 className="mt-3 text-3xl font-black sm:text-4xl">
          {competition.name}
        </h1>
        <p className="mt-3 text-slate-300">
          {competition.season
            ? `Сезон ${competition.season}`
            : "Сезон не вказано"}
          {competition.final_position
            ? ` · Підсумкове місце: ${competition.final_position}`
            : ""}
        </p>
      </header>

      {message && (
        <div
          className={`mt-6 rounded-2xl border px-5 py-4 font-bold ${
            messageType === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {message}
        </div>
      )}

      <nav className="mt-6 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2">
        {(Object.keys(tabLabels) as TabKey[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap rounded-xl px-5 py-3 text-sm font-black ${
              activeTab === tab
                ? "bg-sky-400 text-slate-950"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </nav>

      {activeTab === "overview" && (
        <section className="mt-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Матчі" value={overview.matches} />
            <MetricCard label="Перемоги" value={overview.wins} />
            <MetricCard
              label="Баланс"
              value={`${overview.wins}-${overview.draws}-${overview.losses}`}
            />
            <MetricCard
              label="Голи"
              value={`${overview.goalsFor}:${overview.goalsAgainst}`}
            />
          </div>
        </section>
      )}

      {activeTab === "standings" && (
        <section className="mt-8">
          <SectionHeader
            eyebrow="Основний етап"
            title="Турнірна таблиця"
            buttonLabel="+ Додати команду"
            onButtonClick={openCreateStanding}
          />

          {isStandingEditorOpen && (
            <EditorCard
              title={standingForm.id ? "Редагувати команду" : "Додати команду"}
            >
              <form onSubmit={saveStanding}>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Field label="Команда" className="sm:col-span-2">
                    <input
                      value={standingForm.teamName}
                      onChange={(e) =>
                        setStandingForm({
                          ...standingForm,
                          teamName: e.target.value,
                        })
                      }
                      className="admin-input"
                    />
                  </Field>
                  <Field label="Місце">
                    <NumberInput
                      value={standingForm.position}
                      min={1}
                      onChange={(v) =>
                        setStandingForm({ ...standingForm, position: v })
                      }
                    />
                  </Field>
                  <Field label="Очки">
                    <NumberInput
                      value={standingForm.points}
                      onChange={(v) =>
                        setStandingForm({ ...standingForm, points: v })
                      }
                    />
                  </Field>
                  <Field label="Матчі">
                    <NumberInput
                      value={standingForm.played}
                      onChange={(v) =>
                        setStandingForm({ ...standingForm, played: v })
                      }
                    />
                  </Field>
                  <Field label="Перемоги">
                    <NumberInput
                      value={standingForm.wins}
                      onChange={(v) =>
                        setStandingForm({ ...standingForm, wins: v })
                      }
                    />
                  </Field>
                  <Field label="Нічиї">
                    <NumberInput
                      value={standingForm.draws}
                      onChange={(v) =>
                        setStandingForm({ ...standingForm, draws: v })
                      }
                    />
                  </Field>
                  <Field label="Поразки">
                    <NumberInput
                      value={standingForm.losses}
                      onChange={(v) =>
                        setStandingForm({ ...standingForm, losses: v })
                      }
                    />
                  </Field>
                  <Field label="Забито">
                    <NumberInput
                      value={standingForm.goalsFor}
                      onChange={(v) =>
                        setStandingForm({ ...standingForm, goalsFor: v })
                      }
                    />
                  </Field>
                  <Field label="Пропущено">
                    <NumberInput
                      value={standingForm.goalsAgainst}
                      onChange={(v) =>
                        setStandingForm({ ...standingForm, goalsAgainst: v })
                      }
                    />
                  </Field>
                  <Field label="Форма: W D L" className="sm:col-span-2">
                    <input
                      value={standingForm.form}
                      onChange={(e) =>
                        setStandingForm({
                          ...standingForm,
                          form: e.target.value,
                        })
                      }
                      placeholder="W W D L W"
                      className="admin-input"
                    />
                  </Field>
                  <Field label="URL логотипа" className="sm:col-span-2">
                    <input
                      value={standingForm.logoUrl}
                      onChange={(e) =>
                        setStandingForm({
                          ...standingForm,
                          logoUrl: e.target.value,
                        })
                      }
                      className="admin-input"
                    />
                  </Field>
                  <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 font-bold sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={standingForm.isOlimp}
                      onChange={(e) =>
                        setStandingForm({
                          ...standingForm,
                          isOlimp: e.target.checked,
                        })
                      }
                      className="h-5 w-5 accent-sky-500"
                    />
                    Це Олімп Футзал
                  </label>
                </div>
                <FormActions
                  isSaving={isSaving}
                  submitLabel="Зберегти рядок"
                  onCancel={() => {
                    setStandingForm(emptyStandingForm);
                    setIsStandingEditorOpen(false);
                  }}
                />
              </form>
            </EditorCard>
          )}

          <div className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] border-collapse">
                <thead className="bg-slate-950 text-white">
                  <tr>
                    {[
                      "#",
                      "Команда",
                      "І",
                      "В",
                      "Н",
                      "П",
                      "Голи",
                      "Різн.",
                      "О",
                      "Форма",
                      "Дія",
                    ].map((label) => (
                      <th
                        key={label}
                        className="px-4 py-4 text-center text-xs font-black uppercase tracking-[0.13em] first:text-left"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row) => (
                    <tr
                      key={row.id}
                      className={
                        row.is_olimp
                          ? "bg-sky-50"
                          : "odd:bg-white even:bg-slate-50/70"
                      }
                    >
                      <td className="border-t border-slate-100 px-4 py-4 text-center text-lg font-black">
                        {row.position}
                      </td>
                      <td className="border-t border-slate-100 px-4 py-4">
                        <div className="flex items-center gap-3">
                          <TeamLogo
                            logoUrl={row.logo_url}
                            teamName={row.team_name}
                          />

                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <strong className="truncate">
                              {row.team_name}
                            </strong>

                            {row.is_olimp && (
                              <span className="rounded-full bg-sky-200 px-2 py-1 text-[10px] font-black text-sky-800">
                                НАША КОМАНДА
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <TableNumber value={row.played} />
                      <TableNumber value={row.wins} />
                      <TableNumber value={row.draws} />
                      <TableNumber value={row.losses} />
                      <td className="border-t border-slate-100 px-4 py-4 text-center font-black">
                        {row.goals_for}:{row.goals_against}
                      </td>
                      <td className="border-t border-slate-100 px-4 py-4 text-center font-bold">
                        {row.goals_for - row.goals_against > 0 ? "+" : ""}
                        {row.goals_for - row.goals_against}
                      </td>
                      <TableNumber value={row.points} emphasized />
                      <td className="border-t border-slate-100 px-4 py-4">
                        <div className="flex justify-center gap-1">
                          {row.form.map((result, index) => (
                            <span
                              key={`${row.id}-${index}`}
                              className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-black text-white ${
                                result === "W"
                                  ? "bg-emerald-500"
                                  : result === "D"
                                    ? "bg-amber-400"
                                    : "bg-red-500"
                              }`}
                            >
                              {result}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="border-t border-slate-100 px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditStanding(row)}
                            className="small-primary-button"
                          >
                            Редагувати
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteStanding(row)}
                            disabled={processingId === row.id}
                            className="small-delete-button"
                          >
                            Видалити
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {activeTab === "playoff" && (
        <section className="mt-8">
          <SectionHeader
            eyebrow="Вирішальна стадія"
            title="Плей-оф"
            buttonLabel="+ Додати матч"
            onButtonClick={openCreatePlayoff}
          />

          {isPlayoffEditorOpen && (
            <EditorCard
              title={
                playoffForm.id
                  ? "Редагувати матч плей-оф"
                  : "Додати матч плей-оф"
              }
            >
              <form onSubmit={savePlayoff}>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Field label="Етап" className="sm:col-span-2">
                    <input
                      value={playoffForm.stage}
                      onChange={(e) =>
                        setPlayoffForm({
                          ...playoffForm,
                          stage: e.target.value,
                        })
                      }
                      className="admin-input"
                    />
                  </Field>
                  <Field label="Порядок">
                    <NumberInput
                      value={playoffForm.sortOrder}
                      onChange={(v) =>
                        setPlayoffForm({ ...playoffForm, sortOrder: v })
                      }
                    />
                  </Field>
                  <Field label="Дата">
                    <input
                      type="date"
                      value={playoffForm.matchDate}
                      onChange={(e) =>
                        setPlayoffForm({
                          ...playoffForm,
                          matchDate: e.target.value,
                        })
                      }
                      className="admin-input"
                    />
                  </Field>
                  <Field label="Команда 1">
                    <input
                      value={playoffForm.homeTeam}
                      onChange={(e) =>
                        setPlayoffForm({
                          ...playoffForm,
                          homeTeam: e.target.value,
                        })
                      }
                      className="admin-input"
                    />
                  </Field>
                  <Field label="Рахунок 1">
                    <NumberInput
                      value={playoffForm.homeScore}
                      allowEmpty
                      onChange={(v) =>
                        setPlayoffForm({ ...playoffForm, homeScore: v })
                      }
                    />
                  </Field>
                  <Field label="Команда 2">
                    <input
                      value={playoffForm.awayTeam}
                      onChange={(e) =>
                        setPlayoffForm({
                          ...playoffForm,
                          awayTeam: e.target.value,
                        })
                      }
                      className="admin-input"
                    />
                  </Field>
                  <Field label="Рахунок 2">
                    <NumberInput
                      value={playoffForm.awayScore}
                      allowEmpty
                      onChange={(v) =>
                        setPlayoffForm({ ...playoffForm, awayScore: v })
                      }
                    />
                  </Field>
                  <Field label="Переможець" className="sm:col-span-2">
                    <input
                      value={playoffForm.winnerTeam}
                      onChange={(e) =>
                        setPlayoffForm({
                          ...playoffForm,
                          winnerTeam: e.target.value,
                        })
                      }
                      className="admin-input"
                    />
                  </Field>
                  <Field label="Місце" className="sm:col-span-2">
                    <input
                      value={playoffForm.location}
                      onChange={(e) =>
                        setPlayoffForm({
                          ...playoffForm,
                          location: e.target.value,
                        })
                      }
                      className="admin-input"
                    />
                  </Field>
                </div>
                <FormActions
                  isSaving={isSaving}
                  submitLabel="Зберегти матч"
                  onCancel={() => {
                    setPlayoffForm(emptyPlayoffForm);
                    setIsPlayoffEditorOpen(false);
                  }}
                />
              </form>
            </EditorCard>
          )}

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {playoffMatches.map((row) => {
              const hasScore =
                row.home_score !== null && row.away_score !== null;
              const olimpWon = row.winner_team === "Олімп Футзал";
              return (
                <article
                  key={row.id}
                  className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-700">
                      {row.stage}
                    </span>
                    {hasScore && (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          olimpWon
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {olimpWon ? "ПЕРЕМОГА" : "ПОРАЗКА"}
                      </span>
                    )}
                  </div>
                  <div className="mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <strong className="text-right">{row.home_team}</strong>
                    <div className="rounded-2xl bg-slate-950 px-4 py-3 text-xl font-black text-white">
                      {hasScore ? `${row.home_score} : ${row.away_score}` : "—"}
                    </div>
                    <strong>{row.away_team}</strong>
                  </div>
                  <div className="mt-6 flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditPlayoff(row)}
                      className="small-primary-button"
                    >
                      Редагувати
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePlayoff(row)}
                      disabled={processingId === row.id}
                      className="small-delete-button"
                    >
                      Видалити
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {activeTab === "matches" && (
        <section className="mt-8">
          <SectionHeader eyebrow="Календар" title="Матчі змагання" />
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {matches.map((match) => {
              const opponent = opponentById.get(match.opponent_id);
              return (
                <article
                  key={match.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-slate-500">
                      {match.round_name ?? "Матч"}
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">
                      {match.status}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-slate-500">
                    {formatMatchDate(match)}
                  </p>

                  <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <strong className="text-right">Олімп Футзал</strong>

                    <Link
                      href={`/admin/matches/${match.id}/statistics`}
                      className="inline-flex min-w-20 items-center justify-center rounded-xl bg-slate-950 px-4 py-2 font-black text-white transition hover:bg-sky-500 hover:text-slate-950 focus:outline-none focus:ring-4 focus:ring-sky-200"
                      aria-label={`Редагувати статистику матчу Олімп Футзал проти ${
                        opponent?.name ?? "суперника"
                      }`}
                    >
                      {match.olimp_score !== null &&
                      match.opponent_score !== null
                        ? `${match.olimp_score} : ${match.opponent_score}`
                        : "—"}
                    </Link>

                    <strong>{opponent?.name ?? "Суперник"}</strong>
                  </div>

                  <div className="mt-5 flex flex-wrap justify-center gap-2 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => void openMatchDetails(match)}
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 px-5 font-black text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                    >
                      Показати деталі
                    </button>

                    <Link
                      href={`/admin/matches/${match.id}/statistics`}
                      className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 font-black text-white transition hover:bg-sky-500 hover:text-slate-950"
                    >
                      Редагувати статистику
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {activeTab === "statistics" && (
        <section className="mt-8">
          <SectionHeader eyebrow="Гравці" title="Статистика змагання" />

          <div className="mt-6 grid gap-5 xl:grid-cols-3">
            <PlayerRankingCard
              icon="⚽"
              title="Бомбардири"
              subtitle="Найбільше голів"
              rows={topScorers}
              players={playerById}
              valueSelector={(stats) => stats.goals}
              valueLabel="голів"
              emptyText="Голи ще не зафіксовані"
            />

            <PlayerRankingCard
              icon="🎯"
              title="Асистенти"
              subtitle="Найбільше результативних передач"
              rows={topAssistants}
              players={playerById}
              valueSelector={(stats) => stats.assists}
              valueLabel="асистів"
              emptyText="Асисти ще не зафіксовані"
            />

            <PlayerRankingCard
              icon="⭐"
              title="MVP"
              subtitle="Найчастіше найкращий гравець матчу"
              rows={topMvpPlayers}
              players={playerById}
              valueSelector={(stats) => stats.mvp_awards}
              valueLabel="нагород"
              emptyText="MVP ще не визначали"
            />
          </div>

          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-600">
                Усі показники
              </p>

              <h3 className="mt-2 text-2xl font-black text-slate-950">
                Повна статистика гравців
              </h3>
            </div>

            <label className="flex min-w-[220px] flex-col gap-2">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Сортувати за
              </span>

              <select
                value={playerStatsSort}
                onChange={(event) =>
                  setPlayerStatsSort(event.target.value as PlayerStatsSortKey)
                }
                className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              >
                <option value="goal_contributions">Голи + асисти</option>
                <option value="goals">Голи</option>
                <option value="assists">Асисти</option>
                <option value="mvp">MVP</option>
                <option value="matches">Матчі</option>
                <option value="yellow_cards">Жовті картки</option>
              </select>
            </label>
          </div>

          <div className="mt-5 overflow-hidden rounded-[2rem] border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] border-collapse">
                <thead className="bg-slate-950 text-white">
                  <tr>
                    {[
                      "Гравець",
                      "М",
                      "Г",
                      "А",
                      "Г+А",
                      "ЖК",
                      "ЧК",
                      "АГ",
                      "MVP",
                    ].map((label) => (
                      <th
                        key={label}
                        className="px-5 py-4 text-center text-xs font-black uppercase first:text-left"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {sortedPlayerStats.map((stats) => {
                    const player = playerById.get(stats.player_id);

                    return (
                      <tr
                        key={stats.id}
                        className="odd:bg-white even:bg-slate-50/70"
                      >
                        <td className="border-t border-slate-100 px-5 py-4">
                          <div className="flex items-center gap-3">
                            <PlayerAvatar player={player} size="medium" />

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <strong className="truncate">
                                  {player?.display_name ?? "Гравець"}
                                </strong>

                                {player?.shirt_number !== null &&
                                  player?.shirt_number !== undefined && (
                                    <span className="rounded-full bg-sky-100 px-2 py-1 text-[10px] font-black text-sky-700">
                                      №{player.shirt_number}
                                    </span>
                                  )}
                              </div>

                              <p className="mt-1 truncate text-sm text-slate-500">
                                {player?.full_name ?? ""}
                              </p>
                            </div>
                          </div>
                        </td>

                        <TableNumber value={stats.matches_played} />
                        <TableNumber value={stats.goals} emphasized />
                        <TableNumber value={stats.assists} />
                        <TableNumber
                          value={stats.goals + stats.assists}
                          emphasized
                        />
                        <TableNumber value={stats.yellow_cards} />
                        <TableNumber value={stats.red_cards} />
                        <TableNumber value={stats.own_goals} />
                        <TableNumber value={stats.mvp_awards} />
                      </tr>
                    );
                  })}

                  {sortedPlayerStats.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-6 py-14 text-center font-semibold text-slate-500"
                      >
                        Статистика гравців ще не заповнена.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <style jsx>{`
        .admin-input {
          min-height: 3.25rem;
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgb(226 232 240);
          background: rgb(248 250 252);
          padding: 0.75rem 1rem;
          outline: none;
        }
        .small-primary-button,
        .small-delete-button {
          min-height: 2.25rem;
          border-radius: 9999px;
          padding: 0.45rem 0.9rem;
          font-size: 0.75rem;
          font-weight: 900;
        }
        .small-primary-button {
          background: rgb(2 6 23);
          color: white;
        }
        .small-delete-button {
          border: 1px solid rgb(254 202 202);
          color: rgb(185 28 28);
        }
      `}</style>

      <Modal
        isOpen={isMatchDetailsOpen}
        title="Деталі матчу"
        onClose={closeMatchDetails}
      >
        {isMatchDetailsLoading && (
          <div className="flex min-h-[320px] items-center justify-center rounded-[2rem] bg-white p-8">
            <div className="text-center">
              <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />

              <p className="mt-5 font-black text-slate-700">
                Завантаження деталей матчу...
              </p>
            </div>
          </div>
        )}

        {!isMatchDetailsLoading && matchDetailsError && (
          <div className="rounded-[2rem] bg-white p-8 text-center">
            <p className="font-black text-red-700">{matchDetailsError}</p>

            <button
              type="button"
              onClick={closeMatchDetails}
              className="mt-5 rounded-full bg-slate-950 px-6 py-3 font-black text-white"
            >
              Закрити
            </button>
          </div>
        )}

        {!isMatchDetailsLoading &&
          !matchDetailsError &&
          selectedMatchDetails && (
            <MatchDetailsCard
              details={selectedMatchDetails}
              onClose={closeMatchDetails}
            />
          )}
      </Modal>
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <strong className="mt-3 block text-4xl font-black">{value}</strong>
    </article>
  );
}

function TeamLogo({
  logoUrl,
  teamName,
}: {
  logoUrl: string | null;
  teamName: string;
}) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`Логотип ${teamName}`}
        className="h-11 w-11 shrink-0 rounded-full bg-white object-contain p-1 shadow-sm ring-1 ring-slate-200"
      />
    );
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 font-black text-slate-500 ring-1 ring-slate-200">
      {teamName.trim().slice(0, 1).toUpperCase() || "?"}
    </div>
  );
}

function PlayerAvatar({
  player,
  size = "large",
}: {
  player: PlayerRow | undefined;
  size?: "medium" | "large";
}) {
  const sizeClass = size === "large" ? "h-14 w-14" : "h-11 w-11";

  if (player?.photo_url) {
    return (
      <img
        src={player.photo_url}
        alt={player.display_name}
        className={`${sizeClass} shrink-0 rounded-2xl bg-slate-100 object-cover object-top ring-1 ring-slate-200`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-2xl bg-slate-950 font-black text-white`}
    >
      {(player?.display_name ?? "Г").trim().slice(0, 1).toUpperCase()}
    </div>
  );
}

function PlayerRankingCard({
  icon,
  title,
  subtitle,
  rows,
  players,
  valueSelector,
  valueLabel,
  emptyText,
}: {
  icon: string;
  title: string;
  subtitle: string;
  rows: PlayerStatsRow[];
  players: Map<string, PlayerRow>;
  valueSelector: (stats: PlayerStatsRow) => number;
  valueLabel: string;
  emptyText: string;
}) {
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <header className="bg-slate-950 p-5 text-white">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">
            {icon}
          </span>

          <div>
            <h3 className="text-xl font-black">{title}</h3>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              {subtitle}
            </p>
          </div>
        </div>
      </header>

      <div className="p-4">
        {rows.length > 0 ? (
          <ol className="space-y-3">
            {rows.map((stats, index) => {
              const player = players.get(stats.player_id);
              const value = valueSelector(stats);

              return (
                <li
                  key={`${title}-${stats.id}`}
                  className={`flex items-center gap-3 rounded-2xl border p-3 ${
                    index === 0
                      ? "border-sky-200 bg-sky-50"
                      : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <span className="w-7 shrink-0 text-center text-xl">
                    {medals[index] ?? index + 1}
                  </span>

                  <PlayerAvatar player={player} size="medium" />

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black text-slate-950">
                      {player?.display_name ?? "Гравець"}
                    </p>

                    <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                      {player?.full_name ?? ""}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <strong className="block text-2xl font-black tabular-nums text-slate-950">
                      {value}
                    </strong>

                    <span className="text-[10px] font-black uppercase text-slate-400">
                      {valueLabel}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="flex min-h-44 items-center justify-center rounded-2xl bg-slate-50 px-5 text-center font-semibold text-slate-500">
            {emptyText}
          </div>
        )}
      </div>
    </article>
  );
}

function SectionHeader({
  eyebrow,
  title,
  buttonLabel,
  onButtonClick,
}: {
  eyebrow: string;
  title: string;
  buttonLabel?: string;
  onButtonClick?: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-600">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-3xl font-black">{title}</h2>
      </div>
      {buttonLabel && onButtonClick && (
        <button
          type="button"
          onClick={onButtonClick}
          className="rounded-full bg-sky-400 px-6 py-3 font-black text-slate-950"
        >
          {buttonLabel}
        </button>
      )}
    </div>
  );
}

function EditorCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6 rounded-[2rem] border border-sky-200 bg-white p-6 shadow-lg">
      <h3 className="text-2xl font-black">{title}</h3>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={className}>
      <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  min = 0,
  allowEmpty = false,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: number;
  allowEmpty?: boolean;
}) {
  return (
    <input
      type="number"
      min={min}
      step={1}
      value={value}
      onChange={(event) => {
        if (allowEmpty || event.target.value !== "") {
          onChange(event.target.value);
        }
      }}
      className="admin-input text-center font-black"
    />
  );
}

function FormActions({
  isSaving,
  submitLabel,
  onCancel,
}: {
  isSaving: boolean;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <div className="mt-6 flex gap-3">
      <button
        type="submit"
        disabled={isSaving}
        className="flex-1 rounded-full bg-slate-950 px-6 py-3 font-black text-white"
      >
        {isSaving ? "Збереження..." : submitLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={isSaving}
        className="rounded-full border border-slate-300 px-6 py-3 font-black"
      >
        Скасувати
      </button>
    </div>
  );
}

function TableNumber({
  value,
  emphasized = false,
}: {
  value: number;
  emphasized?: boolean;
}) {
  return (
    <td className="border-t border-slate-100 px-4 py-4 text-center">
      <span className={emphasized ? "text-lg font-black" : "font-bold"}>
        {value}
      </span>
    </td>
  );
}
