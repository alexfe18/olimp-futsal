"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type MatchStatus = "scheduled" | "completed" | "postponed" | "cancelled";

type VenueType = "home" | "away" | "neutral";

type CompetitionType = "championship" | "cup" | "tournament" | "friendly";

type CompetitionRow = {
  id: string;
  name: string;
  short_name: string | null;
  competition_type: CompetitionType;
  season: string | null;
  is_active: boolean;
};

type OpponentRow = {
  id: string;
  name: string;
  short_name: string | null;
  city: string | null;
  logo_url: string | null;
  is_active: boolean;
};

type MatchRow = {
  id: string;
  competition_id: string | null;
  opponent_id: string;
  title: string | null;
  starts_at: string | null;
  location: string | null;
  venue_type: VenueType;
  status: MatchStatus;
  round_name: string | null;
  olimp_score: number | null;
  opponent_score: number | null;
  notes: string | null;
  report: string | null;
  video_url: string | null;
  source_url: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

type MatchFormState = {
  id: string | null;
  competitionId: string;
  opponentId: string;

  newCompetitionName: string;
  newCompetitionSeason: string;
  newCompetitionType: CompetitionType;

  newOpponentName: string;
  newOpponentCity: string;

  title: string;
  startsAt: string;
  location: string;
  venueType: VenueType;
  status: MatchStatus;
  roundName: string;

  olimpScore: string;
  opponentScore: string;

  notes: string;
  report: string;
  videoUrl: string;
  sourceUrl: string;
  isArchived: boolean;
};

type StatusFilter = "all" | MatchStatus;
type PeriodFilter = "all" | "upcoming" | "completed" | "archive";

const emptyForm: MatchFormState = {
  id: null,
  competitionId: "",
  opponentId: "",

  newCompetitionName: "",
  newCompetitionSeason: "",
  newCompetitionType: "championship",

  newOpponentName: "",
  newOpponentCity: "",

  title: "",
  startsAt: "",
  location: "",
  venueType: "home",
  status: "scheduled",
  roundName: "",

  olimpScore: "",
  opponentScore: "",

  notes: "",
  report: "",
  videoUrl: "",
  sourceUrl: "",
  isArchived: false,
};

const statusLabels: Record<MatchStatus, string> = {
  scheduled: "Заплановано",
  completed: "Завершено",
  postponed: "Перенесено",
  cancelled: "Скасовано",
};

const venueLabels: Record<VenueType, string> = {
  home: "Домашній матч",
  away: "Виїзний матч",
  neutral: "Нейтральне поле",
};

const competitionTypeLabels: Record<CompetitionType, string> = {
  championship: "Чемпіонат",
  cup: "Кубок",
  tournament: "Турнір",
  friendly: "Товариський матч",
};

function formatDateTime(dateValue: string | null) {
  if (!dateValue) {
    return "Дата уточнюється";
  }

  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Kyiv",
  }).format(new Date(dateValue));
}

function toDateTimeLocal(dateValue: string | null) {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function parseScore(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    throw new Error("Score must be a non-negative integer.");
  }

  return parsedValue;
}

function getMatchResult(match: MatchRow): "win" | "draw" | "loss" | "unknown" {
  if (
    match.status !== "completed" ||
    match.olimp_score === null ||
    match.opponent_score === null
  ) {
    return "unknown";
  }

  if (match.olimp_score > match.opponent_score) {
    return "win";
  }

  if (match.olimp_score < match.opponent_score) {
    return "loss";
  }

  return "draw";
}

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionRow[]>([]);
  const [opponents, setOpponents] = useState<OpponentRow[]>([]);

  const [form, setForm] = useState<MatchFormState>(emptyForm);

  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [processingMatchId, setProcessingMatchId] = useState<string | null>(
    null,
  );

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");

  const [competitionFilter, setCompetitionFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  async function loadData(showLoader = false) {
    if (showLoader) {
      setIsLoading(true);
    }

    const [
      { data: matchesData, error: matchesError },
      { data: competitionsData, error: competitionsError },
      { data: opponentsData, error: opponentsError },
    ] = await Promise.all([
      supabase
        .from("matches")
        .select(
          `
            id,
            competition_id,
            opponent_id,
            title,
            starts_at,
            location,
            venue_type,
            status,
            round_name,
            olimp_score,
            opponent_score,
            notes,
            report,
            video_url,
            source_url,
            is_archived,
            created_at,
            updated_at
          `,
        )
        .order("starts_at", {
          ascending: false,
          nullsFirst: false,
        })
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("competitions")
        .select("id, name, short_name, competition_type, season, is_active")
        .order("is_active", {
          ascending: false,
        })
        .order("starts_at", {
          ascending: false,
          nullsFirst: false,
        })
        .order("name", {
          ascending: true,
        }),

      supabase
        .from("opponents")
        .select("id, name, short_name, city, logo_url, is_active")
        .order("is_active", {
          ascending: false,
        })
        .order("name", {
          ascending: true,
        }),
    ]);

    if (matchesError || competitionsError || opponentsError) {
      console.error("Matches module loading error:", {
        matchesError,
        competitionsError,
        opponentsError,
      });

      setMessage("Не вдалося завантажити матчі, змагання або суперників.");
      setMessageType("error");
      setIsLoading(false);
      return;
    }

    setMatches((matchesData ?? []) as MatchRow[]);
    setCompetitions((competitionsData ?? []) as CompetitionRow[]);
    setOpponents((opponentsData ?? []) as OpponentRow[]);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadData(true);

    const realtimeChannel = supabase
      .channel("olimp-admin-matches-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
        },
        () => {
          void loadData();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "competitions",
        },
        () => {
          void loadData();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "opponents",
        },
        () => {
          void loadData();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(realtimeChannel);
    };
  }, []);

  const competitionById = useMemo(
    () =>
      new Map(competitions.map((competition) => [competition.id, competition])),
    [competitions],
  );

  const opponentById = useMemo(
    () => new Map(opponents.map((opponent) => [opponent.id, opponent])),
    [opponents],
  );

  const filteredMatches = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLocaleLowerCase("uk-UA");

    const currentTime = Date.now();

    return matches.filter((match) => {
      if (statusFilter !== "all" && match.status !== statusFilter) {
        return false;
      }

      if (competitionFilter && match.competition_id !== competitionFilter) {
        return false;
      }

      if (periodFilter === "archive" && !match.is_archived) {
        return false;
      }

      if (periodFilter === "completed" && match.status !== "completed") {
        return false;
      }

      if (periodFilter === "upcoming") {
        const matchTime = match.starts_at
          ? new Date(match.starts_at).getTime()
          : null;

        const isUpcoming =
          !match.is_archived &&
          match.status === "scheduled" &&
          (matchTime === null || matchTime >= currentTime);

        if (!isUpcoming) {
          return false;
        }
      }

      if (!normalizedSearch) {
        return true;
      }

      const opponent = opponentById.get(match.opponent_id);
      const competition = match.competition_id
        ? competitionById.get(match.competition_id)
        : null;

      const searchableText = [
        match.title ?? "",
        opponent?.name ?? "",
        opponent?.city ?? "",
        competition?.name ?? "",
        competition?.season ?? "",
        match.round_name ?? "",
        match.location ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("uk-UA");

      return searchableText.includes(normalizedSearch);
    });
  }, [
    matches,
    statusFilter,
    competitionFilter,
    periodFilter,
    searchQuery,
    opponentById,
    competitionById,
  ]);

  const filteredStatistics = useMemo(() => {
    const completedMatches = filteredMatches.filter(
      (match) =>
        match.status === "completed" &&
        match.olimp_score !== null &&
        match.opponent_score !== null,
    );

    const wins = completedMatches.filter(
      (match) => getMatchResult(match) === "win",
    ).length;

    const draws = completedMatches.filter(
      (match) => getMatchResult(match) === "draw",
    ).length;

    const losses = completedMatches.filter(
      (match) => getMatchResult(match) === "loss",
    ).length;

    return {
      total: filteredMatches.length,
      wins,
      draws,
      losses,
    };
  }, [filteredMatches]);

  function openCreateForm() {
    setForm(emptyForm);
    setIsEditorOpen(true);
    setMessage("");
    setMessageType("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function openEditForm(match: MatchRow) {
    setForm({
      id: match.id,
      competitionId: match.competition_id ?? "",
      opponentId: match.opponent_id,

      newCompetitionName: "",
      newCompetitionSeason: "",
      newCompetitionType: "championship",

      newOpponentName: "",
      newOpponentCity: "",

      title: match.title ?? "",
      startsAt: toDateTimeLocal(match.starts_at),
      location: match.location ?? "",
      venueType: match.venue_type,
      status: match.status,
      roundName: match.round_name ?? "",

      olimpScore:
        match.olimp_score !== null ? match.olimp_score.toString() : "",

      opponentScore:
        match.opponent_score !== null ? match.opponent_score.toString() : "",

      notes: match.notes ?? "",
      report: match.report ?? "",
      videoUrl: match.video_url ?? "",
      sourceUrl: match.source_url ?? "",
      isArchived: match.is_archived,
    });

    setIsEditorOpen(true);
    setMessage("");
    setMessageType("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function closeEditor() {
    if (isSaving) {
      return;
    }

    setForm(emptyForm);
    setIsEditorOpen(false);
  }

  async function renameSelectedOpponent() {
    if (!form.opponentId) {
      setMessage("Спочатку оберіть суперника.");
      setMessageType("error");
      return;
    }

    const selectedOpponent = opponents.find(
      (opponent) => opponent.id === form.opponentId,
    );

    if (!selectedOpponent) {
      setMessage("Суперника не знайдено.");
      setMessageType("error");
      return;
    }

    const newName = window.prompt(
      "Нова назва суперника:",
      selectedOpponent.name,
    );

    if (newName === null) {
      return;
    }

    const normalizedName = newName.trim();

    if (!normalizedName) {
      setMessage("Назва суперника не може бути порожньою.");
      setMessageType("error");
      return;
    }

    const newCity = window.prompt(
      "Місто суперника:",
      selectedOpponent.city ?? "",
    );

    if (newCity === null) {
      return;
    }

    const { data, error } = await supabase
      .from("opponents")
      .update({
        name: normalizedName,
        city: newCity.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedOpponent.id)
      .select("id")
      .single();

    if (error || !data) {
      console.error("Opponent updating error:", error);

      setMessage("Не вдалося оновити суперника.");
      setMessageType("error");
      return;
    }

    setMessage("Дані суперника успішно оновлено.");
    setMessageType("success");

    await loadData();
  }

  async function createCompetitionIfNeeded() {
    const newCompetitionName = form.newCompetitionName.trim();

    if (!newCompetitionName) {
      return form.competitionId || null;
    }

    const existingCompetition = competitions.find(
      (competition) =>
        competition.name.trim().toLocaleLowerCase("uk-UA") ===
          newCompetitionName.toLocaleLowerCase("uk-UA") &&
        (competition.season ?? "").trim() === form.newCompetitionSeason.trim(),
    );

    if (existingCompetition) {
      return existingCompetition.id;
    }

    const { data, error } = await supabase
      .from("competitions")
      .insert({
        name: newCompetitionName,
        season: form.newCompetitionSeason.trim() || null,
        competition_type: form.newCompetitionType,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    return data.id as string;
  }

  async function createOpponentIfNeeded() {
    const newOpponentName = form.newOpponentName.trim();

    if (!newOpponentName) {
      return form.opponentId || null;
    }

    const existingOpponent = opponents.find(
      (opponent) =>
        opponent.name.trim().toLocaleLowerCase("uk-UA") ===
        newOpponentName.toLocaleLowerCase("uk-UA"),
    );

    if (existingOpponent) {
      return existingOpponent.id;
    }

    const { data, error } = await supabase
      .from("opponents")
      .insert({
        name: newOpponentName,
        city: form.newOpponentCity.trim() || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    return data.id as string;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.opponentId && !form.newOpponentName.trim()) {
      setMessage("Оберіть існуючого суперника або введіть назву нового.");
      setMessageType("error");
      return;
    }

    let olimpScore: number | null;
    let opponentScore: number | null;

    try {
      olimpScore = parseScore(form.olimpScore);
      opponentScore = parseScore(form.opponentScore);
    } catch {
      setMessage("Рахунок повинен складатися з цілих невід’ємних чисел.");
      setMessageType("error");
      return;
    }

    if (
      form.status === "completed" &&
      (olimpScore === null || opponentScore === null)
    ) {
      setMessage("Для завершеного матчу потрібно вказати повний рахунок.");
      setMessageType("error");
      return;
    }

    setIsSaving(true);
    setMessage("");
    setMessageType("");

    try {
      const competitionId = await createCompetitionIfNeeded();

      const opponentId = await createOpponentIfNeeded();

      if (!opponentId) {
        throw new Error("Opponent was not selected.");
      }

      const matchPayload = {
        competition_id: competitionId,
        opponent_id: opponentId,
        title: form.title.trim() || null,

        starts_at: form.startsAt ? new Date(form.startsAt).toISOString() : null,

        location: form.location.trim() || null,
        venue_type: form.venueType,
        status: form.status,
        round_name: form.roundName.trim() || null,

        olimp_score: olimpScore,
        opponent_score: opponentScore,

        notes: form.notes.trim() || null,
        report: form.report.trim() || null,
        video_url: form.videoUrl.trim() || null,
        source_url: form.sourceUrl.trim() || null,

        is_archived: form.isArchived,
        updated_at: new Date().toISOString(),
      };

      if (form.id) {
        const { data, error } = await supabase
          .from("matches")
          .update(matchPayload)
          .eq("id", form.id)
          .select("id")
          .single();

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error("Match update affected no rows.");
        }

        setMessage("Матч успішно оновлено.");
      } else {
        const { data, error } = await supabase
          .from("matches")
          .insert(matchPayload)
          .select("id")
          .single();

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error("Created match was not returned.");
        }

        setMessage("Новий матч успішно додано.");
      }

      setMessageType("success");
      setForm(emptyForm);
      setIsEditorOpen(false);

      await loadData();
    } catch (error) {
      console.error("Match saving error:", error);

      setMessage(
        "Не вдалося зберегти матч. Перевірте дані та права доступу до таблиць.",
      );
      setMessageType("error");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleArchive(match: MatchRow) {
    setProcessingMatchId(match.id);
    setMessage("");
    setMessageType("");

    const { data, error } = await supabase
      .from("matches")
      .update({
        is_archived: !match.is_archived,
        updated_at: new Date().toISOString(),
      })
      .eq("id", match.id)
      .select("id")
      .single();

    if (error || !data) {
      console.error("Match archive updating error:", error);

      setMessage("Не вдалося змінити статус архіву.");
      setMessageType("error");
      setProcessingMatchId(null);
      return;
    }

    setMessage(
      match.is_archived
        ? "Матч повернуто з архіву."
        : "Матч перенесено до архіву.",
    );

    setMessageType("success");
    await loadData();
    setProcessingMatchId(null);
  }

  async function deleteMatch(match: MatchRow) {
    const opponent = opponentById.get(match.opponent_id);

    const isConfirmed = window.confirm(
      `Остаточно видалити матч із командою «${
        opponent?.name ?? "Суперник"
      }»?\n\nЦю дію не можна скасувати.`,
    );

    if (!isConfirmed) {
      return;
    }

    setProcessingMatchId(match.id);
    setMessage("");
    setMessageType("");

    const { data, error } = await supabase
      .from("matches")
      .delete()
      .eq("id", match.id)
      .select("id")
      .single();

    if (error || !data) {
      console.error("Match deletion error:", error);

      setMessage("Не вдалося видалити матч.");
      setMessageType("error");
      setProcessingMatchId(null);
      return;
    }

    setMessage("Матч видалено.");
    setMessageType("success");

    await loadData();
    setProcessingMatchId(null);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />

          <p className="mt-5 text-sm font-black uppercase tracking-[0.22em] text-sky-700">
            Завантаження матчів...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-400">
              Ігрова історія
            </p>

            <h1 className="mt-3 text-3xl font-black sm:text-4xl">Матчі</h1>

            <p className="mt-3 max-w-2xl leading-7 text-slate-300">
              Додавайте майбутні ігри та поступово відновлюйте історію
              попередніх сезонів клубу.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-sky-400 px-6 py-3 font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-300"
          >
            + Додати матч
          </button>
        </div>
      </header>

      {message && (
        <div
          role={messageType === "error" ? "alert" : "status"}
          className={`mt-6 rounded-2xl border px-5 py-4 font-bold ${
            messageType === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {message}
        </div>
      )}

      {isEditorOpen && (
        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-950/5 sm:p-8">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-600">
                {form.id ? "Редагування матчу" : "Нова гра"}
              </p>

              <h2 className="mt-3 text-2xl font-black sm:text-3xl">
                {form.id ? "Редагувати матч" : "Додати матч"}
              </h2>
            </div>

            <button
              type="button"
              onClick={closeEditor}
              aria-label="Закрити форму"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-2xl font-black hover:bg-slate-200"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-8">
            <div className="grid gap-6 xl:grid-cols-2">
              <FormSection title="Суперник">
                <label className="block">
                  <span className="form-label">Існуючий суперник</span>

                  <select
                    value={form.opponentId}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        opponentId: event.target.value,
                        newOpponentName: "",
                        newOpponentCity: "",
                      })
                    }
                    className="admin-input"
                  >
                    <option value="">Оберіть суперника</option>

                    {opponents.map((opponent) => (
                      <option key={opponent.id} value={opponent.id}>
                        {opponent.name}
                        {opponent.city ? ` · ${opponent.city}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                {form.opponentId && (
                  <button
                    type="button"
                    onClick={renameSelectedOpponent}
                    className="mt-3 text-sm font-black text-sky-700 underline decoration-sky-200 underline-offset-4 hover:text-sky-900"
                  >
                    Редагувати назву та місто суперника
                  </button>
                )}

                <div className="my-5 flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  <span className="h-px flex-1 bg-slate-200" />
                  або новий
                  <span className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    type="text"
                    value={form.newOpponentName}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        newOpponentName: event.target.value,
                        opponentId: "",
                      })
                    }
                    placeholder="Назва нової команди"
                    className="admin-input mt-0"
                  />

                  <input
                    type="text"
                    value={form.newOpponentCity}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        newOpponentCity: event.target.value,
                      })
                    }
                    placeholder="Місто"
                    className="admin-input mt-0"
                  />
                </div>
              </FormSection>

              <FormSection title="Змагання">
                <label className="block">
                  <span className="form-label">Існуюче змагання</span>

                  <select
                    value={form.competitionId}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        competitionId: event.target.value,
                        newCompetitionName: "",
                        newCompetitionSeason: "",
                      })
                    }
                    className="admin-input"
                  >
                    <option value="">Без прив’язки до змагання</option>

                    {competitions.map((competition) => (
                      <option key={competition.id} value={competition.id}>
                        {competition.name}
                        {competition.season ? ` · ${competition.season}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="my-5 flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  <span className="h-px flex-1 bg-slate-200" />
                  або нове
                  <span className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    type="text"
                    value={form.newCompetitionName}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        newCompetitionName: event.target.value,
                        competitionId: "",
                      })
                    }
                    placeholder="Назва змагання"
                    className="admin-input mt-0"
                  />

                  <input
                    type="text"
                    value={form.newCompetitionSeason}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        newCompetitionSeason: event.target.value,
                      })
                    }
                    placeholder="Сезон: 2025/26"
                    className="admin-input mt-0"
                  />

                  <select
                    value={form.newCompetitionType}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        newCompetitionType: event.target
                          .value as CompetitionType,
                      })
                    }
                    className="admin-input mt-0 sm:col-span-2"
                  >
                    {Object.entries(competitionTypeLabels).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </FormSection>

              <FormSection title="Основна інформація">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className="form-label">Власний заголовок</span>

                    <input
                      type="text"
                      value={form.title}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          title: event.target.value,
                        })
                      }
                      placeholder="Необов’язково"
                      className="admin-input"
                    />
                  </label>

                  <label>
                    <span className="form-label">Дата та час</span>

                    <input
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          startsAt: event.target.value,
                        })
                      }
                      className="admin-input"
                    />
                  </label>

                  <label>
                    <span className="form-label">Місце</span>

                    <input
                      type="text"
                      value={form.location}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          location: event.target.value,
                        })
                      }
                      placeholder="Спорткомплекс або місто"
                      className="admin-input"
                    />
                  </label>

                  <label>
                    <span className="form-label">Формат</span>

                    <select
                      value={form.venueType}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          venueType: event.target.value as VenueType,
                        })
                      }
                      className="admin-input"
                    >
                      {Object.entries(venueLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="form-label">Тур / етап</span>

                    <input
                      type="text"
                      value={form.roundName}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          roundName: event.target.value,
                        })
                      }
                      placeholder="Наприклад: 7 тур"
                      className="admin-input"
                    />
                  </label>
                </div>
              </FormSection>

              <FormSection title="Статус та рахунок">
                <label>
                  <span className="form-label">Статус</span>

                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        status: event.target.value as MatchStatus,
                      })
                    }
                    className="admin-input"
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-end gap-4">
                  <label>
                    <span className="form-label">Олімп Футзал</span>

                    <input
                      type="number"
                      min={0}
                      value={form.olimpScore}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          olimpScore: event.target.value,
                        })
                      }
                      className="admin-input text-center text-2xl font-black"
                    />
                  </label>

                  <span className="pb-4 text-2xl font-black">:</span>

                  <label>
                    <span className="form-label">Суперник</span>

                    <input
                      type="number"
                      min={0}
                      value={form.opponentScore}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          opponentScore: event.target.value,
                        })
                      }
                      className="admin-input text-center text-2xl font-black"
                    />
                  </label>
                </div>

                <label className="mt-5 flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                  <span>
                    <strong className="block">Архівний матч</strong>

                    <span className="mt-1 block text-sm text-slate-500">
                      Для історії попередніх сезонів.
                    </span>
                  </span>

                  <input
                    type="checkbox"
                    checked={form.isArchived}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        isArchived: event.target.checked,
                      })
                    }
                    className="h-6 w-6 accent-sky-500"
                  />
                </label>
              </FormSection>

              <FormSection
                title="Додаткова інформація"
                className="xl:col-span-2"
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <label>
                    <span className="form-label">Короткі примітки</span>

                    <textarea
                      value={form.notes}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          notes: event.target.value,
                        })
                      }
                      rows={4}
                      className="admin-input resize-y"
                    />
                  </label>

                  <label>
                    <span className="form-label">Звіт про матч</span>

                    <textarea
                      value={form.report}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          report: event.target.value,
                        })
                      }
                      rows={4}
                      className="admin-input resize-y"
                    />
                  </label>

                  <label>
                    <span className="form-label">Відео</span>

                    <input
                      type="url"
                      value={form.videoUrl}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          videoUrl: event.target.value,
                        })
                      }
                      placeholder="https://..."
                      className="admin-input"
                    />
                  </label>

                  <label>
                    <span className="form-label">Джерело / публікація</span>

                    <input
                      type="url"
                      value={form.sourceUrl}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          sourceUrl: event.target.value,
                        })
                      }
                      placeholder="https://..."
                      className="admin-input"
                    />
                  </label>
                </div>
              </FormSection>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex min-h-14 flex-1 items-center justify-center rounded-full bg-slate-950 px-7 py-4 font-black text-white transition enabled:hover:bg-sky-500 enabled:hover:text-slate-950 disabled:opacity-60"
              >
                {isSaving
                  ? "Збереження..."
                  : form.id
                    ? "Зберегти зміни"
                    : "Додати матч"}
              </button>

              <button
                type="button"
                onClick={closeEditor}
                disabled={isSaving}
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-slate-300 px-7 py-4 font-black hover:bg-slate-100 disabled:opacity-60"
              >
                Скасувати
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-slate-500">
            Показники відповідають поточним фільтрам
          </p>

          {(competitionFilter ||
            statusFilter !== "all" ||
            periodFilter !== "all" ||
            searchQuery.trim()) && (
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-700">
              Відфільтровано
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatisticCard
            label="Матчі"
            value={filteredStatistics.total}
            valueClassName="text-sky-600"
          />

          <StatisticCard
            label="Перемоги"
            value={filteredStatistics.wins}
            valueClassName="text-emerald-600"
          />

          <StatisticCard
            label="Нічиї"
            value={filteredStatistics.draws}
            valueClassName="text-amber-600"
          />

          <StatisticCard
            label="Поразки"
            value={filteredStatistics.losses}
            valueClassName="text-red-500"
          />
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-600">
              Календар клубу
            </p>

            <h2 className="mt-2 text-3xl font-black">Усі матчі</h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Пошук"
              className="admin-filter"
            />

            <select
              value={periodFilter}
              onChange={(event) =>
                setPeriodFilter(event.target.value as PeriodFilter)
              }
              className="admin-filter"
            >
              <option value="all">Усі періоди</option>
              <option value="upcoming">Майбутні</option>
              <option value="completed">Завершені</option>
              <option value="archive">Архів</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className="admin-filter"
            >
              <option value="all">Усі статуси</option>

              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={competitionFilter}
              onChange={(event) => setCompetitionFilter(event.target.value)}
              className="admin-filter"
            >
              <option value="">Усі змагання</option>

              {competitions.map((competition) => (
                <option key={competition.id} value={competition.id}>
                  {competition.name}
                  {competition.season ? ` · ${competition.season}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredMatches.length ? (
          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {filteredMatches.map((match) => {
              const opponent = opponentById.get(match.opponent_id);

              const competition = match.competition_id
                ? competitionById.get(match.competition_id)
                : null;

              const result = getMatchResult(match);
              const isProcessing = processingMatchId === match.id;

              return (
                <article
                  key={match.id}
                  className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={match.status} />

                      {match.is_archived && (
                        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-600">
                          АРХІВ
                        </span>
                      )}

                      {match.round_name && (
                        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                          {match.round_name}
                        </span>
                      )}
                    </div>

                    <span className="text-sm font-bold text-slate-500">
                      {venueLabels[match.venue_type]}
                    </span>
                  </div>

                  <div className="p-6">
                    <p className="text-sm font-bold text-slate-500">
                      {competition
                        ? `${competition.name}${
                            competition.season ? ` · ${competition.season}` : ""
                          }`
                        : "Без змагання"}
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      {formatDateTime(match.starts_at)}
                      {match.location ? ` · ${match.location}` : ""}
                    </p>

                    <div className="mt-7 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                      <div
                        className={
                          match.venue_type === "away"
                            ? "order-3 text-right"
                            : ""
                        }
                      >
                        <p className="text-lg font-black sm:text-xl">
                          Олімп Футзал
                        </p>
                      </div>

                      <div className="order-2 min-w-24 rounded-2xl bg-slate-950 px-4 py-3 text-center text-white">
                        {match.olimp_score !== null &&
                        match.opponent_score !== null ? (
                          <strong
                            className={`text-2xl sm:text-3xl ${
                              result === "win"
                                ? "text-emerald-300"
                                : result === "loss"
                                  ? "text-red-300"
                                  : ""
                            }`}
                          >
                            {match.olimp_score} : {match.opponent_score}
                          </strong>
                        ) : (
                          <strong className="text-2xl">—</strong>
                        )}
                      </div>

                      <div
                        className={
                          match.venue_type === "away" ? "order-1" : "text-right"
                        }
                      >
                        <p className="text-lg font-black sm:text-xl">
                          {opponent?.name ?? "Суперник"}
                        </p>

                        {opponent?.city && (
                          <p className="mt-1 text-sm text-slate-500">
                            {opponent.city}
                          </p>
                        )}
                      </div>
                    </div>

                    {match.notes && (
                      <p className="mt-6 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                        {match.notes}
                      </p>
                    )}

                    <div className="mt-6 flex flex-wrap gap-2">
                      <Link
                        href={`/admin/matches/${match.id}/statistics`}
                        className="match-primary-button inline-flex items-center justify-center"
                      >
                        Статистика гравців
                      </Link>

                      <button
                        type="button"
                        onClick={() => openEditForm(match)}
                        disabled={isProcessing}
                        className="match-secondary-button"
                      >
                        Редагувати
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleArchive(match)}
                        disabled={isProcessing}
                        className="match-secondary-button"
                      >
                        {match.is_archived ? "Повернути з архіву" : "До архіву"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteMatch(match)}
                        disabled={isProcessing}
                        className="match-delete-button"
                      >
                        Видалити
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-lg font-black">Матчів поки немає</p>

            <p className="mt-2 text-slate-500">
              Додайте перший майбутній або архівний матч.
            </p>

            <button
              type="button"
              onClick={openCreateForm}
              className="mt-5 rounded-full bg-slate-950 px-6 py-3 font-black text-white"
            >
              + Додати матч
            </button>
          </div>
        )}
      </section>

      <style jsx>{`
        .form-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgb(71 85 105);
        }

        .admin-input {
          margin-top: 0.75rem;
          min-height: 3.5rem;
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgb(226 232 240);
          background: rgb(248 250 252);
          padding: 0.875rem 1.25rem;
          outline: none;
        }

        .admin-input:focus,
        .admin-filter:focus {
          border-color: rgb(56 189 248);
          box-shadow: 0 0 0 4px rgb(224 242 254);
          background: white;
        }

        .admin-filter {
          min-height: 3rem;
          border-radius: 1rem;
          border: 1px solid rgb(226 232 240);
          background: white;
          padding: 0.75rem 1rem;
          font-weight: 700;
          outline: none;
        }

        .match-primary-button,
        .match-secondary-button,
        .match-delete-button {
          min-height: 2.5rem;
          border-radius: 9999px;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 900;
          transition: 0.2s;
        }

        .match-primary-button {
          background: rgb(2 6 23);
          color: white;
        }

        .match-primary-button:hover {
          background: rgb(14 165 233);
          color: rgb(2 6 23);
        }

        .match-secondary-button {
          border: 1px solid rgb(203 213 225);
          color: rgb(51 65 85);
        }

        .match-secondary-button:hover {
          background: rgb(241 245 249);
        }

        .match-delete-button {
          border: 1px solid rgb(254 202 202);
          color: rgb(185 28 28);
        }

        .match-delete-button:hover {
          background: rgb(254 242 242);
        }
      `}</style>
    </div>
  );
}

function FormSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <fieldset
      className={`rounded-3xl border border-slate-200 bg-slate-50/60 p-5 sm:p-6 ${className}`}
    >
      <legend className="px-2 text-sm font-black uppercase tracking-[0.18em] text-slate-700">
        {title}
      </legend>

      <div className="mt-2">{children}</div>
    </fieldset>
  );
}

function StatisticCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: number;
  valueClassName: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{label}</p>

      <strong className={`mt-3 block text-4xl font-black ${valueClassName}`}>
        {value}
      </strong>
    </article>
  );
}

function StatusBadge({ status }: { status: MatchStatus }) {
  const styles: Record<MatchStatus, string> = {
    scheduled: "bg-sky-100 text-sky-700",
    completed: "bg-emerald-100 text-emerald-700",
    postponed: "bg-amber-100 text-amber-800",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${styles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}
