"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type MatchRow = {
  id: string;
  competition_id: string | null;
  opponent_id: string;
  starts_at: string | null;
  status: string;
  round_name: string | null;
  olimp_score: number | null;
  opponent_score: number | null;
};

type PlayerRow = {
  id: string;
  full_name: string;
  display_name: string;
  shirt_number: number | null;
  position: string | null;
  photo_url: string | null;
  is_active: boolean;
};

type SavedRow = {
  player_id: string;
  played: boolean;
  started: boolean;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  own_goals: number;
  is_mvp: boolean;
  clean_sheet: boolean;
  goals_conceded: number;
};

type EditorRow = {
  player: PlayerRow;
  played: boolean;
  started: boolean;
  goals: string;
  assists: string;
  yellowCards: string;
  redCards: string;
  ownGoals: string;
  isMvp: boolean;
  cleanSheet: boolean;
  goalsConceded: string;
};

function numberValue(value: string, label: string) {
  const parsed = Number(value || 0);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label}: введіть ціле невід’ємне число.`);
  }

  return parsed;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function MatchStatisticsPage() {
  const { matchId } = useParams<{ matchId: string }>();

  const [match, setMatch] = useState<MatchRow | null>(null);
  const [opponentName, setOpponentName] = useState("Суперник");
  const [competitionName, setCompetitionName] = useState("");
  const [rows, setRows] = useState<EditorRow[]>([]);

  const [search, setSearch] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "warning" | "error" | ""
  >("");

  async function loadData() {
    setLoading(true);

    const [
      { data: matchData, error: matchError },
      { data: playersData, error: playersError },
      { data: savedData, error: savedError },
    ] = await Promise.all([
      supabase
        .from("matches")
        .select(
          "id, competition_id, opponent_id, starts_at, status, round_name, olimp_score, opponent_score",
        )
        .eq("id", matchId)
        .single(),

      supabase
        .from("players")
        .select(
          "id, full_name, display_name, shirt_number, position, photo_url, is_active",
        )
        .order("is_active", { ascending: false })
        .order("shirt_number", {
          ascending: true,
          nullsFirst: false,
        })
        .order("full_name", { ascending: true }),

      supabase
        .from("match_player_stats")
        .select(
          "player_id, played, started, goals, assists, yellow_cards, red_cards, own_goals, is_mvp, clean_sheet, goals_conceded",
        )
        .eq("match_id", matchId),
    ]);

    if (matchError || playersError || savedError) {
      console.error({ matchError, playersError, savedError });
      setMessage("Не вдалося завантажити матч або склад.");
      setMessageType("error");
      setLoading(false);
      return;
    }

    const currentMatch = matchData as MatchRow;
    const savedByPlayer = new Map(
      ((savedData ?? []) as SavedRow[]).map((item) => [item.player_id, item]),
    );

    setMatch(currentMatch);
    setRows(
      ((playersData ?? []) as PlayerRow[]).map((player) => {
        const saved = savedByPlayer.get(player.id);

        return {
          player,
          played: saved?.played ?? false,
          started: saved?.started ?? false,
          goals: String(saved?.goals ?? 0),
          assists: String(saved?.assists ?? 0),
          yellowCards: String(saved?.yellow_cards ?? 0),
          redCards: String(saved?.red_cards ?? 0),
          ownGoals: String(saved?.own_goals ?? 0),
          isMvp: saved?.is_mvp ?? false,
          cleanSheet: saved?.clean_sheet ?? false,
          goalsConceded: String(saved?.goals_conceded ?? 0),
        };
      }),
    );

    const [{ data: opponent }, { data: competition }] = await Promise.all([
      supabase
        .from("opponents")
        .select("name")
        .eq("id", currentMatch.opponent_id)
        .single(),

      currentMatch.competition_id
        ? supabase
            .from("competitions")
            .select("name, season")
            .eq("id", currentMatch.competition_id)
            .single()
        : Promise.resolve({ data: null }),
    ]);

    setOpponentName(opponent?.name ?? "Суперник");
    setCompetitionName(
      competition
        ? `${competition.name}${
            competition.season ? ` · ${competition.season}` : ""
          }`
        : "",
    );

    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, [matchId]);

  function updatePlayer(
    playerId: string,
    values: Partial<Omit<EditorRow, "player">>,
  ) {
    setRows((current) =>
      current.map((row) => {
        if (row.player.id !== playerId) {
          return row;
        }

        const next = { ...row, ...values };

        if (values.played === false) {
          return {
            ...next,
            started: false,
            goals: "0",
            assists: "0",
            yellowCards: "0",
            redCards: "0",
            ownGoals: "0",
            isMvp: false,
            cleanSheet: false,
            goalsConceded: "0",
          };
        }

        return next;
      }),
    );
  }

  const visibleRows = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("uk-UA");

    return rows.filter((row) => {
      if (onlySelected && !row.played) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return [
        row.player.full_name,
        row.player.display_name,
        row.player.position ?? "",
        String(row.player.shirt_number ?? ""),
      ]
        .join(" ")
        .toLocaleLowerCase("uk-UA")
        .includes(normalized);
    });
  }, [onlySelected, rows, search]);

  const totals = useMemo(() => {
    const selected = rows.filter((row) => row.played);

    return {
      players: selected.length,
      goals: selected.reduce((sum, row) => sum + Number(row.goals || 0), 0),
      assists: selected.reduce((sum, row) => sum + Number(row.assists || 0), 0),
      yellow: selected.reduce(
        (sum, row) => sum + Number(row.yellowCards || 0),
        0,
      ),
      red: selected.reduce((sum, row) => sum + Number(row.redCards || 0), 0),
      ownGoals: selected.reduce(
        (sum, row) => sum + Number(row.ownGoals || 0),
        0,
      ),
    };
  }, [rows]);

  const goalValidation = useMemo(() => {
    if (!match || match.status !== "completed" || match.olimp_score === null) {
      return { status: "neutral" as const, difference: 0 };
    }

    const difference = totals.goals - match.olimp_score;

    if (difference === 0) {
      return { status: "valid" as const, difference };
    }

    return { status: "warning" as const, difference };
  }, [match, totals.goals]);

  const matchSummary = useMemo(() => {
    const selected = rows.filter((row) => row.played);

    const formatPlayers = (valueSelector: (row: EditorRow) => number) =>
      selected
        .map((row) => ({
          name: row.player.display_name,
          value: valueSelector(row),
        }))
        .filter((item) => item.value > 0);

    return {
      scorers: formatPlayers((row) => Number(row.goals || 0)),
      assistants: formatPlayers((row) => Number(row.assists || 0)),
      yellowCards: formatPlayers((row) => Number(row.yellowCards || 0)),
      redCards: formatPlayers((row) => Number(row.redCards || 0)),
      ownGoals: formatPlayers((row) => Number(row.ownGoals || 0)),
      mvp: selected.find((row) => row.isMvp)?.player.display_name ?? null,
    };
  }, [rows]);

  const liveScore = useMemo(() => {
    const playerGoals = rows
      .filter((row) => row.played)
      .reduce((sum, row) => sum + Number(row.goals || 0), 0);

    const ownGoals = rows
      .filter((row) => row.played)
      .reduce((sum, row) => sum + Number(row.ownGoals || 0), 0);

    return {
      olimp: playerGoals + ownGoals,
      opponent: match?.opponent_score ?? 0,
      playerGoals,
      ownGoals,
    };
  }, [match?.opponent_score, rows]);

  const validation = useMemo(() => {
    if (!match) {
      return {
        goalsMatch: true,
        assistsValid: true,
        canSave: false,
        messages: [] as string[],
      };
    }

    const messages: string[] = [];
    const expectedGoals = match.olimp_score;

    const goalsMatch =
      expectedGoals === null || liveScore.olimp === expectedGoals;

    if (!goalsMatch) {
      messages.push(
        `У статистиці вказано ${liveScore.olimp} голів, а в рахунку матчу — ${expectedGoals}.`,
      );
    }

    const totalAssists = rows
      .filter((row) => row.played)
      .reduce((sum, row) => sum + Number(row.assists || 0), 0);

    const maximumAssists = liveScore.playerGoals;
    const assistsValid = totalAssists <= maximumAssists;

    if (!assistsValid) {
      messages.push(
        `Асистів (${totalAssists}) більше, ніж голів гравців (${maximumAssists}). Автогол не має асиста.`,
      );
    }

    return {
      goalsMatch,
      assistsValid,
      canSave: goalsMatch && assistsValid,
      messages,
    };
  }, [liveScore, match, rows]);

  function selectAllActivePlayers() {
    setRows((current) =>
      current.map((row) => ({
        ...row,
        played: row.player.is_active,
      })),
    );
  }

  function clearSelection() {
    setRows((current) =>
      current.map((row) => ({
        ...row,
        played: false,
        started: false,
        goals: "0",
        assists: "0",
        yellowCards: "0",
        redCards: "0",
        ownGoals: "0",
        isMvp: false,
        cleanSheet: false,
        goalsConceded: "0",
      })),
    );
  }

  async function recalculateSeason(competitionId: string) {
    const { data: completed, error: completedError } = await supabase
      .from("matches")
      .select("id, starts_at, olimp_score, opponent_score")
      .eq("competition_id", competitionId)
      .eq("status", "completed");

    if (completedError) {
      throw completedError;
    }

    const completedMatches = completed ?? [];
    const matchIds = completedMatches.map((item) => item.id);

    if (matchIds.length) {
      const { data: allStats, error: allStatsError } = await supabase
        .from("match_player_stats")
        .select(
          "player_id, played, goals, assists, yellow_cards, red_cards, own_goals, is_mvp, clean_sheet, goals_conceded",
        )
        .in("match_id", matchIds);

      if (allStatsError) {
        throw allStatsError;
      }

      const aggregate = new Map<string, any>();

      for (const item of allStats ?? []) {
        const current = aggregate.get(item.player_id) ?? {
          matches_played: 0,
          goals: 0,
          assists: 0,
          yellow_cards: 0,
          red_cards: 0,
          own_goals: 0,
          mvp_awards: 0,
          clean_sheets: 0,
          goals_conceded: 0,
        };

        current.matches_played += item.played ? 1 : 0;
        current.goals += Number(item.goals ?? 0);
        current.assists += Number(item.assists ?? 0);
        current.yellow_cards += Number(item.yellow_cards ?? 0);
        current.red_cards += Number(item.red_cards ?? 0);
        current.own_goals += Number(item.own_goals ?? 0);
        current.mvp_awards += item.is_mvp ? 1 : 0;
        current.clean_sheets += item.clean_sheet ? 1 : 0;
        current.goals_conceded += Number(item.goals_conceded ?? 0);

        aggregate.set(item.player_id, current);
      }

      const seasonRows = Array.from(aggregate.entries()).map(
        ([playerId, values]) => ({
          player_id: playerId,
          competition_id: competitionId,
          ...values,
          updated_at: new Date().toISOString(),
        }),
      );

      if (seasonRows.length) {
        const { error } = await supabase
          .from("player_competition_stats")
          .upsert(seasonRows, {
            onConflict: "player_id,competition_id",
          });

        if (error) {
          throw error;
        }
      }
    }

    const sorted = [...completedMatches].sort((a, b) => {
      return (
        new Date(a.starts_at ?? 0).getTime() -
        new Date(b.starts_at ?? 0).getTime()
      );
    });

    const wins = sorted.filter(
      (item) => Number(item.olimp_score) > Number(item.opponent_score),
    ).length;

    const draws = sorted.filter(
      (item) => item.olimp_score === item.opponent_score,
    ).length;

    const losses = sorted.length - wins - draws;

    const goalsFor = sorted.reduce(
      (sum, item) => sum + Number(item.olimp_score ?? 0),
      0,
    );

    const goalsAgainst = sorted.reduce(
      (sum, item) => sum + Number(item.opponent_score ?? 0),
      0,
    );

    const form = sorted.slice(-5).map((item) => {
      if (Number(item.olimp_score) > Number(item.opponent_score)) {
        return "W";
      }

      if (item.olimp_score === item.opponent_score) {
        return "D";
      }

      return "L";
    });
  }

  async function saveStatistics(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!match) {
      return;
    }

    setSaving(true);
    setMessage("");
    setMessageType("");

    try {
      const selectedRows = rows.filter((row) => row.played);

      if (selectedRows.filter((row) => row.isMvp).length > 1) {
        throw new Error("Для одного матчу можна обрати лише одного MVP.");
      }

      const payload = selectedRows.map((row) => ({
        match_id: match.id,
        player_id: row.player.id,
        played: true,
        started: row.started,
        goals: numberValue(row.goals, `${row.player.display_name}: голи`),
        assists: numberValue(row.assists, `${row.player.display_name}: асисти`),
        yellow_cards: numberValue(
          row.yellowCards,
          `${row.player.display_name}: жовті`,
        ),
        red_cards: numberValue(
          row.redCards,
          `${row.player.display_name}: червоні`,
        ),
        own_goals: numberValue(
          row.ownGoals,
          `${row.player.display_name}: автоголи`,
        ),
        is_mvp: row.isMvp,
        clean_sheet: row.cleanSheet,
        goals_conceded: numberValue(
          row.goalsConceded,
          `${row.player.display_name}: пропущено`,
        ),
        updated_at: new Date().toISOString(),
      }));

      if (payload.length) {
        const { error } = await supabase
          .from("match_player_stats")
          .upsert(payload, {
            onConflict: "match_id,player_id",
          });

        if (error) {
          throw error;
        }
      }

      const { error: clearError } = await supabase
        .from("match_player_stats")
        .delete()
        .eq("match_id", match.id)
        .not(
          "player_id",
          "in",
          `(${payload.map((item) => item.player_id).join(",") || "00000000-0000-0000-0000-000000000000"})`,
        );

      if (clearError) {
        throw clearError;
      }

      if (match.competition_id) {
        await recalculateSeason(match.competition_id);
      }

      const enteredGoals = payload.reduce((sum, item) => sum + item.goals, 0);

      if (
        match.status === "completed" &&
        match.olimp_score !== null &&
        enteredGoals !== match.olimp_score
      ) {
        setMessage(
          `Збережено. У гравців ${enteredGoals} голів, а в рахунку матчу — ${match.olimp_score}. Перевірте дані.`,
        );
        setMessageType("warning");
      } else {
        setMessage(
          match.competition_id
            ? "Статистику збережено. Сезонні показники та рядок Олімп Футзал перераховано."
            : "Статистику матчу збережено.",
        );
        setMessageType("success");
      }

      await loadData();
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Не вдалося зберегти статистику.",
      );
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="font-black text-sky-700">Завантаження складу...</p>
      </div>
    );
  }

  if (!match) {
    return <p>Матч не знайдено.</p>;
  }

  return (
    <div>
      <header className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl sm:p-8">
        <Link href="/admin/matches" className="text-sm font-bold text-sky-400">
          ← Усі матчі
        </Link>

        <p className="mt-6 text-xs font-black uppercase tracking-[0.24em] text-sky-400">
          Статистика матчу
        </p>

        <h1 className="mt-3 text-3xl font-black sm:text-4xl">
          Олімп Футзал — {opponentName}
        </h1>

        <p className="mt-3 text-slate-300">
          {competitionName || "Без змагання"}
          {match.round_name ? ` · ${match.round_name}` : ""}
        </p>

        <div className="mt-5 inline-flex rounded-2xl bg-white/10 px-5 py-3 text-2xl font-black">
          {match.olimp_score !== null && match.opponent_score !== null
            ? `${match.olimp_score} : ${match.opponent_score}`
            : "Рахунок не вказано"}
        </div>
      </header>

      <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-600">
              Live-перегляд
            </p>

            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Поточний рахунок зі статистики
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Оновлюється одразу після натискання «+» або «−».
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 rounded-3xl bg-slate-950 px-6 py-5 text-white">
            <span className="text-right font-black">Олімп Футзал</span>

            <span className="rounded-2xl bg-white/10 px-5 py-3 text-3xl font-black tabular-nums">
              {liveScore.olimp} : {liveScore.opponent}
            </span>

            <span className="font-black">{opponentName}</span>
          </div>
        </div>

        <div
          className={`mt-5 rounded-2xl border px-5 py-4 ${
            validation.canSave
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {validation.canSave ? (
            <p className="font-bold">
              Дані узгоджені з рахунком матчу. Статистику можна зберігати.
            </p>
          ) : (
            <div>
              <p className="font-black">Потрібно перевірити дані:</p>

              <ul className="mt-2 list-disc space-y-1 pl-5 font-semibold">
                {validation.messages.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {message && (
        <div
          className={`mt-6 rounded-2xl border px-5 py-4 font-bold ${
            messageType === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : messageType === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {message}
        </div>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Summary label="Гравці" value={totals.players} />
        <Summary label="Голи" value={totals.goals} />
        <Summary label="Асисти" value={totals.assists} />
        <Summary label="Жовті" value={totals.yellow} />
        <Summary label="Червоні" value={totals.red} />
        <Summary label="Автоголи" value={totals.ownGoals} />
      </section>

      {goalValidation.status !== "neutral" && (
        <section
          className={`mt-6 rounded-3xl border px-5 py-5 ${
            goalValidation.status === "valid"
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p
                className={`font-black ${
                  goalValidation.status === "valid"
                    ? "text-emerald-900"
                    : "text-amber-900"
                }`}
              >
                {goalValidation.status === "valid"
                  ? "Сума голів збігається з рахунком матчу"
                  : "Перевірте кількість голів гравців"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                У рахунку матчу: {match.olimp_score}. У статистиці гравців:{" "}
                {totals.goals}.
                {goalValidation.status === "warning"
                  ? " Можливий гол суперника у власні ворота або помилка введення."
                  : ""}
              </p>
            </div>

            <span
              className={`rounded-full px-4 py-2 text-sm font-black ${
                goalValidation.status === "valid"
                  ? "bg-emerald-200 text-emerald-900"
                  : "bg-amber-200 text-amber-900"
              }`}
            >
              {totals.goals} / {match.olimp_score}
            </span>
          </div>
        </section>
      )}

      <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-600">
            Підсумок матчу
          </p>

          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Автори подій
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Блок оновлюється одразу під час введення статистики.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MatchSummaryCard
            icon="⚽"
            title="Голи"
            items={matchSummary.scorers}
            emptyText="Голи ще не вказані"
          />

          <MatchSummaryCard
            icon="🎯"
            title="Асисти"
            items={matchSummary.assistants}
            emptyText="Асисти ще не вказані"
          />

          <MatchSummaryCard
            icon="🟨"
            title="Жовті картки"
            items={matchSummary.yellowCards}
            emptyText="Жовтих карток немає"
          />

          <MatchSummaryCard
            icon="🟥"
            title="Червоні картки"
            items={matchSummary.redCards}
            emptyText="Червоних карток немає"
          />

          <MatchSummaryCard
            icon="🥅"
            title="Автоголи"
            items={matchSummary.ownGoals}
            emptyText="Автоголів немає"
          />

          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">
                ⭐
              </span>

              <h3 className="font-black text-slate-950">MVP</h3>
            </div>

            <p className="mt-4 font-bold text-slate-700">
              {matchSummary.mvp ?? "MVP ще не обрано"}
            </p>
          </article>
        </div>
      </section>

      <form onSubmit={saveStatistics} className="mt-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-600">
              Склад команди
            </p>
            <h2 className="mt-2 text-3xl font-black">Статистика гравців</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Пошук гравця"
              className="min-h-12 rounded-2xl border border-slate-200 px-5"
            />

            <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 font-bold">
              <input
                type="checkbox"
                checked={onlySelected}
                onChange={(event) => setOnlySelected(event.target.checked)}
                className="h-5 w-5 accent-sky-500"
              />
              Лише обрані
            </label>

            <button
              type="button"
              onClick={selectAllActivePlayers}
              className="min-h-12 rounded-2xl border border-sky-200 bg-sky-50 px-5 font-black text-sky-800 transition hover:bg-sky-100 sm:col-span-2"
            >
              Обрати всіх активних
            </button>

            <button
              type="button"
              onClick={clearSelection}
              className="min-h-12 rounded-2xl border border-slate-200 bg-white px-5 font-black text-slate-600 transition hover:bg-slate-100 sm:col-span-2"
            >
              Очистити вибір
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {visibleRows.map((row) => {
            const goalkeeper =
              row.player.position
                ?.toLocaleLowerCase("uk-UA")
                .includes("ворот") ?? false;

            return (
              <article
                key={row.player.id}
                className={`rounded-[2rem] border bg-white p-5 shadow-sm ${
                  row.played ? "border-sky-300" : "border-slate-200 opacity-75"
                }`}
              >
                <div className="flex flex-col gap-5 2xl:flex-row 2xl:items-center">
                  <div className="flex min-w-0 items-center gap-4 2xl:w-[15rem] 2xl:shrink-0">
                    {row.player.photo_url ? (
                      <img
                        src={row.player.photo_url}
                        alt=""
                        className="h-16 w-16 rounded-2xl object-cover object-top"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 font-black text-white">
                        {initials(row.player.display_name)}
                      </div>
                    )}

                    <div>
                      <strong className="text-lg">
                        {row.player.display_name}
                      </strong>
                      <p className="text-sm text-slate-500">
                        {row.player.position ?? "Без позиції"}
                      </p>

                      {row.played && (
                        <span
                          className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${
                            row.started
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {row.started ? "Стартовий склад" : "Запас"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid w-full flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Check
                      label="Грав"
                      checked={row.played}
                      onChange={(value) =>
                        updatePlayer(row.player.id, {
                          played: value,
                        })
                      }
                    />

                    <Check
                      label="Старт"
                      checked={row.started}
                      disabled={!row.played}
                      onChange={(value) =>
                        updatePlayer(row.player.id, {
                          started: value,
                        })
                      }
                    />

                    <Num
                      label="Голи"
                      value={row.goals}
                      disabled={!row.played}
                      onChange={(value) =>
                        updatePlayer(row.player.id, {
                          goals: value,
                        })
                      }
                    />

                    <Num
                      label="Асисти"
                      value={row.assists}
                      disabled={!row.played}
                      onChange={(value) =>
                        updatePlayer(row.player.id, {
                          assists: value,
                        })
                      }
                    />

                    <Num
                      label="ЖК"
                      value={row.yellowCards}
                      disabled={!row.played}
                      onChange={(value) =>
                        updatePlayer(row.player.id, {
                          yellowCards: value,
                        })
                      }
                    />

                    <Num
                      label="ЧК"
                      value={row.redCards}
                      disabled={!row.played}
                      onChange={(value) =>
                        updatePlayer(row.player.id, {
                          redCards: value,
                        })
                      }
                    />

                    <Num
                      label="АГ"
                      value={row.ownGoals}
                      disabled={!row.played}
                      onChange={(value) =>
                        updatePlayer(row.player.id, {
                          ownGoals: value,
                        })
                      }
                    />

                    <Check
                      label="MVP"
                      checked={row.isMvp}
                      disabled={!row.played}
                      onChange={(value) =>
                        setRows((current) =>
                          current.map((item) => ({
                            ...item,
                            isMvp: value && item.player.id === row.player.id,
                          })),
                        )
                      }
                    />
                  </div>
                </div>

                {goalkeeper && row.played && (
                  <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2 xl:max-w-xl">
                    <Check
                      label="Сухий матч"
                      checked={row.cleanSheet}
                      onChange={(value) =>
                        updatePlayer(row.player.id, {
                          cleanSheet: value,
                          goalsConceded: value ? "0" : row.goalsConceded,
                        })
                      }
                    />

                    <Num
                      label="Пропущено"
                      value={row.goalsConceded}
                      disabled={row.cleanSheet}
                      onChange={(value) =>
                        updatePlayer(row.player.id, {
                          goalsConceded: value,
                        })
                      }
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <section className="mt-8 rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-400">
            Попередній перегляд
          </p>

          <h2 className="mt-3 text-2xl font-black">Картка матчу</h2>

          <div className="mt-6 flex flex-col items-center justify-center gap-4 text-center sm:flex-row">
            <strong className="text-xl">Олімп Футзал</strong>

            <span className="rounded-2xl bg-white/10 px-6 py-4 text-3xl font-black tabular-nums">
              {liveScore.olimp} : {liveScore.opponent}
            </span>

            <strong className="text-xl">{opponentName}</strong>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <PreviewList
              title="Голи"
              icon="⚽"
              items={matchSummary.scorers}
              emptyText="Голи не вказані"
            />

            <PreviewList
              title="Асисти"
              icon="🎯"
              items={matchSummary.assistants}
              emptyText="Асисти не вказані"
            />

            <PreviewList
              title="Жовті картки"
              icon="🟨"
              items={matchSummary.yellowCards}
              emptyText="Жовтих карток немає"
            />

            <PreviewList
              title="Червоні картки"
              icon="🟥"
              items={matchSummary.redCards}
              emptyText="Червоних карток немає"
            />

            <PreviewList
              title="Автоголи"
              icon="🥅"
              items={matchSummary.ownGoals}
              emptyText="Автоголів немає"
            />

            <article className="rounded-3xl bg-white/5 p-5">
              <h3 className="font-black">⭐ MVP</h3>
              <p className="mt-4 text-slate-300">
                {matchSummary.mvp ?? "MVP ще не обрано"}
              </p>
            </article>
          </div>
        </section>

        <div className="sticky bottom-4 z-20 mt-8 rounded-[2rem] border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={saving || !validation.canSave}
              className="min-h-14 flex-1 rounded-full bg-slate-950 px-7 font-black text-white transition enabled:hover:bg-sky-500 enabled:hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Збереження та перерахунок..."
                : validation.canSave
                  ? "Зберегти статистику матчу"
                  : "Виправте статистику перед збереженням"}
            </button>

            <Link
              href="/admin/matches"
              className="inline-flex min-h-14 items-center justify-center rounded-full border border-slate-300 px-7 font-black"
            >
              До матчів
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <strong className="mt-2 block text-3xl font-black">{value}</strong>
    </article>
  );
}

function Check({
  label,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      className={`flex min-h-14 flex-col items-center justify-center rounded-2xl border px-2 py-2 ${
        checked ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-slate-50"
      } ${disabled ? "opacity-40" : ""}`}
    >
      <span className="text-xs font-black uppercase text-slate-500">
        {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-2 h-5 w-5 accent-sky-500"
      />
    </label>
  );
}

function Num({
  label,
  value,
  disabled = false,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const parsedValue = Number(value);
  const currentValue =
    Number.isFinite(parsedValue) && parsedValue >= 0
      ? Math.floor(parsedValue)
      : 0;

  function decrease() {
    if (disabled || currentValue <= 0) {
      return;
    }

    onChange(String(currentValue - 1));
  }

  function increase() {
    if (disabled) {
      return;
    }

    onChange(String(currentValue + 1));
  }

  return (
    <div>
      <span className="block text-center text-xs font-black uppercase text-slate-500">
        {label}
      </span>

      <div
        className={`mt-2 grid min-h-11 w-full min-w-0 grid-cols-[2.5rem_minmax(2.75rem,1fr)_2.5rem] overflow-hidden rounded-2xl border ${
          disabled
            ? "border-slate-200 bg-slate-100 opacity-45"
            : "border-slate-200 bg-white"
        }`}
      >
        <button
          type="button"
          onClick={decrease}
          disabled={disabled || currentValue <= 0}
          className="flex items-center justify-center border-r border-slate-200 text-lg font-black text-slate-600 transition enabled:hover:bg-slate-100 enabled:hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-300"
          aria-label={`Зменшити показник «${label}»`}
        >
          −
        </button>

        <output
          aria-label={`${label}: ${currentValue}`}
          className="flex min-w-0 items-center justify-center bg-white px-1 text-center text-lg font-black tabular-nums text-slate-950"
        >
          {currentValue}
        </output>

        <button
          type="button"
          onClick={increase}
          disabled={disabled}
          className="flex items-center justify-center border-l border-slate-200 text-lg font-black text-slate-600 transition enabled:hover:bg-slate-100 enabled:hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-300"
          aria-label={`Збільшити показник «${label}»`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function PreviewList({
  title,
  icon,
  items,
  emptyText,
}: {
  title: string;
  icon: string;
  items: Array<{
    name: string;
    value: number;
  }>;
  emptyText: string;
}) {
  return (
    <article className="rounded-3xl bg-white/5 p-5">
      <h3 className="font-black">
        {icon} {title}
      </h3>

      {items.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li
              key={`${title}-${item.name}`}
              className="flex items-center justify-between gap-4 text-slate-200"
            >
              <span>{item.name}</span>
              <strong>{item.value}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-slate-400">{emptyText}</p>
      )}
    </article>
  );
}

function MatchSummaryCard({
  icon,
  title,
  items,
  emptyText,
}: {
  icon: string;
  title: string;
  items: Array<{
    name: string;
    value: number;
  }>;
  emptyText: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden="true">
          {icon}
        </span>

        <h3 className="font-black text-slate-950">{title}</h3>
      </div>

      {items.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li
              key={`${title}-${item.name}`}
              className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3"
            >
              <span className="min-w-0 truncate font-bold text-slate-700">
                {item.name}
              </span>

              <span className="shrink-0 rounded-full bg-sky-100 px-3 py-1 text-sm font-black text-sky-700">
                {item.value}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm font-medium text-slate-500">{emptyText}</p>
      )}
    </article>
  );
}
