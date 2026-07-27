"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Competition = {
  id: string;
  name: string;
  season: string | null;
  final_position: number | null;
};

type Player = {
  id: string;
  full_name: string;
  display_name: string;
  shirt_number: number | null;
  position: string | null;
  photo_url: string | null;
  is_active: boolean;
};

type PlayerStats = {
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
  clean_sheets: number;
  goals_conceded: number;
  notes: string | null;
};

type Match = {
  id: string;
  status: string;
  olimp_score: number | null;
  opponent_score: number | null;
};

type Editor = {
  playerId: string;
  matchesPlayed: string;
  goals: string;
  assists: string;
  yellowCards: string;
  redCards: string;
  ownGoals: string;
  mvpAwards: string;
  cleanSheets: string;
  goalsConceded: string;
  notes: string;
};

type SortKey = "goals" | "assists" | "actions" | "matches" | "name";

const emptyEditor: Editor = {
  playerId: "",
  matchesPlayed: "0",
  goals: "0",
  assists: "0",
  yellowCards: "0",
  redCards: "0",
  ownGoals: "0",
  mvpAwards: "0",
  cleanSheets: "0",
  goalsConceded: "0",
  notes: "",
};

function toNumber(value: string, label: string) {
  const number = Number(value || 0);
  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`${label} має бути цілим невід’ємним числом.`);
  }
  return number;
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "OF"
  );
}

export default function AdminStatisticsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [competitionId, setCompetitionId] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("goals");
  const [onlyWithData, setOnlyWithData] = useState(false);
  const [editor, setEditor] = useState<Editor>(emptyEditor);
  const [editorOpen, setEditorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  async function loadBase() {
    setLoading(true);
    const [competitionsResult, playersResult] = await Promise.all([
      supabase
        .from("competitions")
        .select("id, name, season, final_position")
        .order("starts_at", { ascending: false, nullsFirst: false }),
      supabase
        .from("players")
        .select(
          "id, full_name, display_name, shirt_number, position, photo_url, is_active",
        )
        .order("is_active", { ascending: false })
        .order("shirt_number", { ascending: true, nullsFirst: false }),
    ]);

    if (competitionsResult.error || playersResult.error) {
      console.error(competitionsResult.error || playersResult.error);
      setMessage("Не вдалося завантажити дані статистики.");
      setMessageType("error");
      setLoading(false);
      return;
    }

    const loadedCompetitions = (competitionsResult.data ?? []) as Competition[];
    setCompetitions(loadedCompetitions);
    setPlayers((playersResult.data ?? []) as Player[]);
    setCompetitionId(
      loadedCompetitions.find((item) => item.season === "2025/26")?.id ??
        loadedCompetitions[0]?.id ??
        "",
    );
    setLoading(false);
  }

  async function loadCompetitionData(id: string) {
    if (!id) {
      setStats([]);
      setMatches([]);
      return;
    }

    const [statsResult, matchesResult] = await Promise.all([
      supabase
        .from("player_competition_stats")
        .select(
          "id, player_id, competition_id, matches_played, goals, assists, yellow_cards, red_cards, own_goals, mvp_awards, clean_sheets, goals_conceded, notes",
        )
        .eq("competition_id", id),
      supabase
        .from("matches")
        .select("id, status, olimp_score, opponent_score")
        .eq("competition_id", id),
    ]);

    if (statsResult.error || matchesResult.error) {
      console.error(statsResult.error || matchesResult.error);
      setMessage("Не вдалося завантажити статистику обраного сезону.");
      setMessageType("error");
      return;
    }

    setStats((statsResult.data ?? []) as PlayerStats[]);
    setMatches((matchesResult.data ?? []) as Match[]);
  }

  useEffect(() => {
    void loadBase();
  }, []);

  useEffect(() => {
    void loadCompetitionData(competitionId);
  }, [competitionId]);

  const selectedCompetition =
    competitions.find((item) => item.id === competitionId) ?? null;
  const statsMap = useMemo(
    () => new Map(stats.map((item) => [item.player_id, item])),
    [stats],
  );

  const rows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("uk-UA");
    const result = players
      .map((player) => ({ player, stats: statsMap.get(player.id) ?? null }))
      .filter(({ player, stats: playerStats }) => {
        if (onlyWithData && !playerStats) return false;
        if (!query) return true;
        return [
          player.full_name,
          player.display_name,
          player.position ?? "",
          player.shirt_number ?? "",
        ]
          .join(" ")
          .toLocaleLowerCase("uk-UA")
          .includes(query);
      });

    return result.sort((a, b) => {
      if (sort === "name")
        return a.player.full_name.localeCompare(b.player.full_name, "uk-UA");
      if (sort === "matches")
        return (b.stats?.matches_played ?? 0) - (a.stats?.matches_played ?? 0);
      if (sort === "assists")
        return (b.stats?.assists ?? 0) - (a.stats?.assists ?? 0);
      if (sort === "actions") {
        return (
          (b.stats?.goals ?? 0) +
          (b.stats?.assists ?? 0) -
          ((a.stats?.goals ?? 0) + (a.stats?.assists ?? 0))
        );
      }
      return (b.stats?.goals ?? 0) - (a.stats?.goals ?? 0);
    });
  }, [players, statsMap, search, onlyWithData, sort]);

  const completedMatches = matches.filter(
    (match) =>
      match.status === "completed" &&
      match.olimp_score !== null &&
      match.opponent_score !== null,
  );

  const summary = useMemo(() => {
    const goalsFor = completedMatches.reduce(
      (sum, item) => sum + (item.olimp_score ?? 0),
      0,
    );
    const goalsAgainst = completedMatches.reduce(
      (sum, item) => sum + (item.opponent_score ?? 0),
      0,
    );
    const wins = completedMatches.filter(
      (item) => (item.olimp_score ?? 0) > (item.opponent_score ?? 0),
    ).length;
    const draws = completedMatches.filter(
      (item) => item.olimp_score === item.opponent_score,
    ).length;
    return {
      played: completedMatches.length,
      goalsFor,
      goalsAgainst,
      difference: goalsFor - goalsAgainst,
      wins,
      draws,
      losses: completedMatches.length - wins - draws,
    };
  }, [completedMatches]);

  const topScorer = rows.reduce<(typeof rows)[number] | null>((best, row) => {
    if (!row.stats) return best;
    if (!best || (row.stats.goals ?? 0) > (best.stats?.goals ?? 0)) return row;
    return best;
  }, null);

  const topAssistant = rows.reduce<(typeof rows)[number] | null>(
    (best, row) => {
      if (!row.stats) return best;
      if (!best || (row.stats.assists ?? 0) > (best.stats?.assists ?? 0))
        return row;
      return best;
    },
    null,
  );

  function openEditor(player: Player, playerStats: PlayerStats | null) {
    setEditor({
      playerId: player.id,
      matchesPlayed: String(playerStats?.matches_played ?? 0),
      goals: String(playerStats?.goals ?? 0),
      assists: String(playerStats?.assists ?? 0),
      yellowCards: String(playerStats?.yellow_cards ?? 0),
      redCards: String(playerStats?.red_cards ?? 0),
      ownGoals: String(playerStats?.own_goals ?? 0),
      mvpAwards: String(playerStats?.mvp_awards ?? 0),
      cleanSheets: String(playerStats?.clean_sheets ?? 0),
      goalsConceded: String(playerStats?.goals_conceded ?? 0),
      notes: playerStats?.notes ?? "",
    });
    setEditorOpen(true);
    setMessage("");
    setMessageType("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveStats(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = {
        player_id: editor.playerId,
        competition_id: competitionId,
        matches_played: toNumber(editor.matchesPlayed, "Матчі"),
        goals: toNumber(editor.goals, "Голи"),
        assists: toNumber(editor.assists, "Асисти"),
        yellow_cards: toNumber(editor.yellowCards, "Жовті картки"),
        red_cards: toNumber(editor.redCards, "Червоні картки"),
        own_goals: toNumber(editor.ownGoals, "Автоголи"),
        mvp_awards: toNumber(editor.mvpAwards, "MVP"),
        clean_sheets: toNumber(editor.cleanSheets, "Сухі матчі"),
        goals_conceded: toNumber(editor.goalsConceded, "Пропущені голи"),
        notes: editor.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("player_competition_stats")
        .upsert(payload, { onConflict: "player_id,competition_id" });

      if (error) throw error;
      setMessage("Статистику гравця успішно збережено.");
      setMessageType("success");
      setEditorOpen(false);
      setEditor(emptyEditor);
      await loadCompetitionData(competitionId);
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

  const editedPlayer =
    players.find((player) => player.id === editor.playerId) ?? null;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="font-black uppercase tracking-[0.22em] text-sky-700">
          Завантаження статистики...
        </p>
      </div>
    );
  }

  return (
    <div>
      <header className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-400">
              Аналітика команди
            </p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">Статистика</h1>
            <p className="mt-3 max-w-2xl leading-7 text-slate-300">
              Сезонні показники гравців, результативність та загальні підсумки
              команди.
            </p>
          </div>

          <label className="w-full xl:max-w-xl">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">
              Змагання та сезон
            </span>
            <select
              value={competitionId}
              onChange={(event) => {
                setCompetitionId(event.target.value);
                setEditorOpen(false);
              }}
              className="mt-3 min-h-14 w-full rounded-2xl bg-white px-5 py-3 font-bold text-slate-950 outline-none"
            >
              {competitions.map((competition) => (
                <option key={competition.id} value={competition.id}>
                  {competition.name}
                  {competition.season ? ` · ${competition.season}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {message && (
        <div
          className={`mt-6 rounded-2xl border px-5 py-4 font-bold ${messageType === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}
        >
          {message}
        </div>
      )}

      {selectedCompetition && (
        <div className="mt-6 flex flex-wrap gap-3">
          <span className="rounded-full bg-sky-100 px-4 py-2 text-sm font-black text-sky-700">
            {selectedCompetition.season ?? "Без сезону"}
          </span>
          <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm">
            {selectedCompetition.name}
          </span>
          {selectedCompetition.final_position && (
            <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-black text-amber-800">
              Місце: {selectedCompetition.final_position}
            </span>
          )}
        </div>
      )}

      {editorOpen && editedPlayer && (
        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <PlayerPhoto player={editedPlayer} large />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">
                  Редагування показників
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  {editedPlayer.display_name}
                </h2>
                <p className="mt-1 text-slate-500">{editedPlayer.full_name}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditorOpen(false)}
              className="h-11 w-11 rounded-full bg-slate-100 text-2xl font-black"
            >
              ×
            </button>
          </div>

          <form onSubmit={saveStats} className="mt-8">
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
              <NumberField
                label="Матчі"
                value={editor.matchesPlayed}
                onChange={(value) =>
                  setEditor({ ...editor, matchesPlayed: value })
                }
              />
              <NumberField
                label="Голи"
                value={editor.goals}
                onChange={(value) => setEditor({ ...editor, goals: value })}
              />
              <NumberField
                label="Асисти"
                value={editor.assists}
                onChange={(value) => setEditor({ ...editor, assists: value })}
              />
              <NumberField
                label="Жовті"
                value={editor.yellowCards}
                onChange={(value) =>
                  setEditor({ ...editor, yellowCards: value })
                }
              />
              <NumberField
                label="Червоні"
                value={editor.redCards}
                onChange={(value) => setEditor({ ...editor, redCards: value })}
              />
              <NumberField
                label="Автоголи"
                value={editor.ownGoals}
                onChange={(value) => setEditor({ ...editor, ownGoals: value })}
              />
              <NumberField
                label="MVP"
                value={editor.mvpAwards}
                onChange={(value) => setEditor({ ...editor, mvpAwards: value })}
              />
              <NumberField
                label="Сухі матчі"
                value={editor.cleanSheets}
                onChange={(value) =>
                  setEditor({ ...editor, cleanSheets: value })
                }
              />
              <NumberField
                label="Пропущено"
                value={editor.goalsConceded}
                onChange={(value) =>
                  setEditor({ ...editor, goalsConceded: value })
                }
              />
              <label>
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">
                  Примітка
                </span>
                <input
                  value={editor.notes}
                  onChange={(event) =>
                    setEditor({ ...editor, notes: event.target.value })
                  }
                  className="mt-3 min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5"
                />
              </label>
            </div>
            <div className="mt-8 flex gap-3">
              <button
                disabled={saving}
                className="min-h-14 flex-1 rounded-full bg-slate-950 px-7 font-black text-white"
              >
                {saving ? "Збереження..." : "Зберегти статистику"}
              </button>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="min-h-14 rounded-full border border-slate-300 px-7 font-black"
              >
                Скасувати
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <SummaryCard
          label="Найкращий бомбардир"
          value={
            topScorer
              ? `${topScorer.player.display_name} · ${topScorer.stats?.goals ?? 0}`
              : "Немає даних"
          }
        />
        <SummaryCard
          label="Найкращий асистент"
          value={
            topAssistant
              ? `${topAssistant.player.display_name} · ${topAssistant.stats?.assists ?? 0}`
              : "Немає даних"
          }
        />
        <SummaryCard label="Командні голи" value={String(summary.goalsFor)} />
        <SummaryCard
          label="Баланс сезону"
          value={`${summary.wins}-${summary.draws}-${summary.losses}`}
        />
      </section>

      <section className="mt-6 rounded-[2rem] bg-slate-950 p-6 text-white sm:p-8">
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <DarkItem label="Матчі" value={summary.played} />
          <DarkItem label="Перемоги" value={summary.wins} />
          <DarkItem label="Голи" value={summary.goalsFor} />
          <DarkItem label="Різниця" value={summary.difference} />
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-600">
              Особисті показники
            </p>
            <h2 className="mt-2 text-3xl font-black">Статистика гравців</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Пошук гравця"
              className="min-h-12 rounded-2xl border border-slate-200 bg-white px-5"
            />
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="min-h-12 rounded-2xl border border-slate-200 bg-white px-5 font-bold"
            >
              <option value="goals">За голами</option>
              <option value="assists">За асистами</option>
              <option value="actions">Гол + пас</option>
              <option value="matches">За матчами</option>
              <option value="name">За ім’ям</option>
            </select>
            <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 font-bold">
              <input
                type="checkbox"
                checked={onlyWithData}
                onChange={(event) => setOnlyWithData(event.target.checked)}
                className="h-5 w-5 accent-sky-500"
              />
              Лише з даними
            </label>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse">
              <thead className="bg-slate-950 text-white">
                <tr>
                  <Th left>Гравець</Th>
                  <Th>М</Th>
                  <Th>Г</Th>
                  <Th>А</Th>
                  <Th>Г+А</Th>
                  <Th>ЖК</Th>
                  <Th>ЧК</Th>
                  <Th>АГ</Th>
                  <Th>MVP</Th>
                  <Th>Дія</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ player, stats: playerStats }, index) => (
                  <tr
                    key={player.id}
                    className={index % 2 ? "bg-slate-50/70" : "bg-white"}
                  >
                    <td className="border-t border-slate-100 px-5 py-4">
                      <div className="flex items-center gap-4">
                        <PlayerPhoto player={player} />
                        <div>
                          <div className="flex items-center gap-2">
                            <strong>{player.display_name}</strong>
                            {player.shirt_number !== null && (
                              <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-black text-sky-700">
                                №{player.shirt_number}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-slate-500">
                            {player.full_name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <Td value={playerStats?.matches_played ?? 0} />
                    <Td value={playerStats?.goals ?? 0} bold />
                    <Td value={playerStats?.assists ?? 0} />
                    <Td
                      value={
                        (playerStats?.goals ?? 0) + (playerStats?.assists ?? 0)
                      }
                      bold
                    />
                    <Td value={playerStats?.yellow_cards ?? 0} />
                    <Td value={playerStats?.red_cards ?? 0} />
                    <Td value={playerStats?.own_goals ?? 0} />
                    <Td value={playerStats?.mvp_awards ?? 0} />
                    <td className="border-t border-slate-100 px-5 py-4 text-center">
                      <button
                        onClick={() => openEditor(player, playerStats)}
                        className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white"
                      >
                        Редагувати
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function PlayerPhoto({
  player,
  large = false,
}: {
  player: Player;
  large?: boolean;
}) {
  const classes = large
    ? "h-20 w-20 rounded-3xl text-xl"
    : "h-14 w-14 rounded-2xl text-base";
  if (player.photo_url)
    return (
      <img
        src={player.photo_url}
        alt={player.display_name}
        className={`${classes} shrink-0 object-cover object-top`}
      />
    );
  return (
    <div
      className={`${classes} flex shrink-0 items-center justify-center bg-slate-950 font-black text-white`}
    >
      {initials(player.display_name)}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">
        {label}
      </span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 text-center text-xl font-black"
      />
    </label>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <strong className="mt-3 block text-2xl font-black text-slate-950">
        {value}
      </strong>
    </article>
  );
}

function DarkItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">
        {label}
      </p>
      <strong className="mt-3 block text-4xl font-black">{value}</strong>
    </div>
  );
}

function Th({
  children,
  left = false,
}: {
  children: React.ReactNode;
  left?: boolean;
}) {
  return (
    <th
      className={`px-5 py-4 text-xs font-black uppercase tracking-[0.16em] ${left ? "text-left" : "text-center"}`}
    >
      {children}
    </th>
  );
}

function Td({ value, bold = false }: { value: number; bold?: boolean }) {
  return (
    <td className="border-t border-slate-100 px-5 py-4 text-center">
      <span
        className={bold ? "text-lg font-black" : "font-bold text-slate-700"}
      >
        {value}
      </span>
    </td>
  );
}
