"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type CompetitionType = "championship" | "cup" | "tournament" | "friendly";
type StatusFilter = "all" | "active" | "archive";
type TypeFilter = "all" | CompetitionType;

type CompetitionRow = {
  id: string;
  name: string;
  short_name: string | null;
  competition_type: CompetitionType;
  season: string | null;
  starts_at: string | null;
  ends_at: string | null;
  final_position: number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type MatchRow = {
  id: string;
  competition_id: string | null;
  status: string;
  olimp_score: number | null;
  opponent_score: number | null;
};

type PlayerStatsRow = {
  id: string;
  competition_id: string;
};

type FormState = {
  id: string | null;
  name: string;
  shortName: string;
  type: CompetitionType;
  season: string;
  startsAt: string;
  endsAt: string;
  finalPosition: string;
  isActive: boolean;
  notes: string;
};

const emptyForm: FormState = {
  id: null,
  name: "",
  shortName: "",
  type: "championship",
  season: "",
  startsAt: "",
  endsAt: "",
  finalPosition: "",
  isActive: true,
  notes: "",
};

const typeLabels: Record<CompetitionType, string> = {
  championship: "Чемпіонат",
  cup: "Кубок",
  tournament: "Турнір",
  friendly: "Товариські матчі",
};

const typeIcons: Record<CompetitionType, string> = {
  championship: "🏆",
  cup: "🥇",
  tournament: "⚽",
  friendly: "🤝",
};

function formatDate(value: string | null) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function getPeriod(item: CompetitionRow) {
  const start = formatDate(item.starts_at);
  const end = formatDate(item.ends_at);
  if (start && end) return `${start} — ${end}`;
  return start || end || "Дати не вказані";
}

export default function AdminCompetitionsPage() {
  const [competitions, setCompetitions] = useState<CompetitionRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStatsRow[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  async function loadData(showLoader = false) {
    if (showLoader) setIsLoading(true);

    const [competitionsResult, matchesResult, statsResult] = await Promise.all([
      supabase
        .from("competitions")
        .select(
          "id,name,short_name,competition_type,season,starts_at,ends_at,final_position,is_active,notes,created_at,updated_at",
        )
        .order("is_active", { ascending: false })
        .order("starts_at", { ascending: false, nullsFirst: false }),
      supabase
        .from("matches")
        .select("id,competition_id,status,olimp_score,opponent_score"),
      supabase.from("player_competition_stats").select("id,competition_id"),
    ]);

    if (competitionsResult.error || matchesResult.error || statsResult.error) {
      console.error("Competitions loading error", {
        competitions: competitionsResult.error,
        matches: matchesResult.error,
        stats: statsResult.error,
      });
      setMessage("Не вдалося завантажити дані змагань.");
      setMessageType("error");
      setIsLoading(false);
      return;
    }

    setCompetitions((competitionsResult.data ?? []) as CompetitionRow[]);
    setMatches((matchesResult.data ?? []) as MatchRow[]);
    setPlayerStats((statsResult.data ?? []) as PlayerStatsRow[]);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadData(true);

    const channel = supabase
      .channel("admin-competitions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "competitions" },
        () => {
          void loadData();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const summaryByCompetition = useMemo(() => {
    const result = new Map<
      string,
      {
        matches: number;
        wins: number;
        draws: number;
        losses: number;
        goalsFor: number;
        goalsAgainst: number;
        playersWithStats: number;
      }
    >();

    for (const competition of competitions) {
      const relatedMatches = matches.filter(
        (match) => match.competition_id === competition.id,
      );
      const completed = relatedMatches.filter(
        (match) =>
          match.status === "completed" &&
          match.olimp_score !== null &&
          match.opponent_score !== null,
      );
      const wins = completed.filter(
        (match) => (match.olimp_score ?? 0) > (match.opponent_score ?? 0),
      ).length;
      const draws = completed.filter(
        (match) => match.olimp_score === match.opponent_score,
      ).length;

      result.set(competition.id, {
        matches: relatedMatches.length,
        wins,
        draws,
        losses: completed.length - wins - draws,
        goalsFor: completed.reduce(
          (sum, match) => sum + (match.olimp_score ?? 0),
          0,
        ),
        goalsAgainst: completed.reduce(
          (sum, match) => sum + (match.opponent_score ?? 0),
          0,
        ),
        playersWithStats: playerStats.filter(
          (row) => row.competition_id === competition.id,
        ).length,
      });
    }

    return result;
  }, [competitions, matches, playerStats]);

  const overview = useMemo(
    () => ({
      total: competitions.length,
      active: competitions.filter((item) => item.is_active).length,
      archive: competitions.filter((item) => !item.is_active).length,
      matches: matches.length,
    }),
    [competitions, matches],
  );

  const filteredCompetitions = useMemo(() => {
    const search = searchQuery.trim().toLocaleLowerCase("uk-UA");

    return competitions.filter((item) => {
      if (statusFilter === "active" && !item.is_active) return false;
      if (statusFilter === "archive" && item.is_active) return false;
      if (typeFilter !== "all" && item.competition_type !== typeFilter)
        return false;
      if (!search) return true;

      return [
        item.name,
        item.short_name ?? "",
        item.season ?? "",
        item.notes ?? "",
        typeLabels[item.competition_type],
      ]
        .join(" ")
        .toLocaleLowerCase("uk-UA")
        .includes(search);
    });
  }, [competitions, searchQuery, statusFilter, typeFilter]);

  function openCreateForm() {
    setForm(emptyForm);
    setIsEditorOpen(true);
    setMessage("");
    setMessageType("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openEditForm(item: CompetitionRow) {
    setForm({
      id: item.id,
      name: item.name,
      shortName: item.short_name ?? "",
      type: item.competition_type,
      season: item.season ?? "",
      startsAt: item.starts_at ?? "",
      endsAt: item.ends_at ?? "",
      finalPosition:
        item.final_position !== null ? String(item.final_position) : "",
      isActive: item.is_active,
      notes: item.notes ?? "",
    });
    setIsEditorOpen(true);
    setMessage("");
    setMessageType("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeEditor() {
    if (isSaving) return;
    setForm(emptyForm);
    setIsEditorOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    if (!name) {
      setMessage("Вкажіть назву змагання.");
      setMessageType("error");
      return;
    }

    if (form.startsAt && form.endsAt && form.endsAt < form.startsAt) {
      setMessage("Дата завершення не може бути раніше дати початку.");
      setMessageType("error");
      return;
    }

    let finalPosition: number | null = null;
    if (form.finalPosition.trim()) {
      finalPosition = Number(form.finalPosition);
      if (!Number.isInteger(finalPosition) || finalPosition < 1) {
        setMessage("Підсумкове місце має бути цілим додатним числом.");
        setMessageType("error");
        return;
      }
    }

    const duplicate = competitions.find(
      (item) =>
        item.id !== form.id &&
        item.name.trim().toLocaleLowerCase("uk-UA") ===
          name.toLocaleLowerCase("uk-UA") &&
        (item.season ?? "").trim() === form.season.trim(),
    );

    if (duplicate) {
      setMessage("Змагання з такою назвою та сезоном уже існує.");
      setMessageType("error");
      return;
    }

    setIsSaving(true);
    setMessage("");
    setMessageType("");

    try {
      const payload = {
        name,
        short_name: form.shortName.trim() || null,
        competition_type: form.type,
        season: form.season.trim() || null,
        starts_at: form.startsAt || null,
        ends_at: form.endsAt || null,
        final_position: finalPosition,
        is_active: form.isActive,
        notes: form.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const query = form.id
        ? supabase.from("competitions").update(payload).eq("id", form.id)
        : supabase.from("competitions").insert(payload);

      const { data, error } = await query.select("id").single();
      if (error) throw error;
      if (!data) throw new Error("Competition was not saved.");

      setMessage(
        form.id
          ? "Змагання успішно оновлено."
          : "Нове змагання успішно створено.",
      );
      setMessageType("success");
      setIsEditorOpen(false);
      setForm(emptyForm);
      await loadData();
    } catch (error) {
      console.error("Competition saving error", error);
      setMessage("Не вдалося зберегти змагання.");
      setMessageType("error");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleStatus(item: CompetitionRow) {
    const nextStatus = !item.is_active;
    const confirmed = window.confirm(
      nextStatus
        ? `Активувати змагання «${item.name}»?`
        : `Перенести змагання «${item.name}» до архіву?`,
    );
    if (!confirmed) return;

    setProcessingId(item.id);
    const { data, error } = await supabase
      .from("competitions")
      .update({ is_active: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", item.id)
      .select("id")
      .single();

    if (error || !data) {
      console.error("Competition status error", error);
      setMessage("Не вдалося змінити статус змагання.");
      setMessageType("error");
      setProcessingId(null);
      return;
    }

    setMessage(
      nextStatus ? "Змагання активовано." : "Змагання перенесено до архіву.",
    );
    setMessageType("success");
    await loadData();
    setProcessingId(null);
  }

  async function deleteCompetition(item: CompetitionRow) {
    const summary = summaryByCompetition.get(item.id);
    if ((summary?.matches ?? 0) > 0 || (summary?.playersWithStats ?? 0) > 0) {
      setMessage(
        "Це змагання пов’язане з матчами або статистикою. Для збереження історії перенесіть його до архіву.",
      );
      setMessageType("error");
      return;
    }

    if (!window.confirm(`Остаточно видалити змагання «${item.name}»?`)) return;

    setProcessingId(item.id);
    const { data, error } = await supabase
      .from("competitions")
      .delete()
      .eq("id", item.id)
      .select("id")
      .single();

    if (error || !data) {
      console.error("Competition delete error", error);
      setMessage("Не вдалося видалити змагання.");
      setMessageType("error");
      setProcessingId(null);
      return;
    }

    setMessage("Змагання видалено.");
    setMessageType("success");
    await loadData();
    setProcessingId(null);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />
          <p className="mt-5 text-sm font-black uppercase tracking-[0.22em] text-sky-700">
            Завантаження змагань...
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
              Сезони та турніри
            </p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">Змагання</h1>
            <p className="mt-3 max-w-2xl leading-7 text-slate-300">
              Керуйте чемпіонатами, кубками, турнірами та архівними сезонами
              клубу.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-sky-400 px-6 py-3 font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-300"
          >
            + Додати змагання
          </button>
        </div>
      </header>

      {message && (
        <div
          role={messageType === "error" ? "alert" : "status"}
          className={`mt-6 rounded-2xl border px-5 py-4 font-bold ${messageType === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}
        >
          {message}
        </div>
      )}

      {isEditorOpen && (
        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-950/5 sm:p-8">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-600">
                {form.id ? "Редагування змагання" : "Новий турнір"}
              </p>
              <h2 className="mt-3 text-2xl font-black sm:text-3xl">
                {form.id ? "Редагувати змагання" : "Додати змагання"}
              </h2>
            </div>
            <button
              type="button"
              onClick={closeEditor}
              aria-label="Закрити форму"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-2xl font-black hover:bg-slate-200"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-8">
            <div className="grid gap-6 md:grid-cols-2">
              <Field label="Назва змагання" className="md:col-span-2">
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Наприклад: Чемпіонат Миколаївської області"
                  className="admin-input"
                />
              </Field>
              <Field label="Коротка назва">
                <input
                  value={form.shortName}
                  onChange={(event) =>
                    setForm({ ...form, shortName: event.target.value })
                  }
                  placeholder="Наприклад: ЧМО"
                  className="admin-input"
                />
              </Field>
              <Field label="Тип">
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      type: event.target.value as CompetitionType,
                    })
                  }
                  className="admin-input"
                >
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Сезон">
                <input
                  value={form.season}
                  onChange={(event) =>
                    setForm({ ...form, season: event.target.value })
                  }
                  placeholder="2026/27"
                  className="admin-input"
                />
              </Field>
              <Field label="Підсумкове місце">
                <input
                  type="number"
                  min={1}
                  value={form.finalPosition}
                  onChange={(event) =>
                    setForm({ ...form, finalPosition: event.target.value })
                  }
                  placeholder="Після завершення"
                  className="admin-input"
                />
              </Field>
              <Field label="Дата початку">
                <input
                  type="date"
                  value={form.startsAt}
                  onChange={(event) =>
                    setForm({ ...form, startsAt: event.target.value })
                  }
                  className="admin-input"
                />
              </Field>
              <Field label="Дата завершення">
                <input
                  type="date"
                  value={form.endsAt}
                  onChange={(event) =>
                    setForm({ ...form, endsAt: event.target.value })
                  }
                  className="admin-input"
                />
              </Field>
              <Field label="Опис або примітки" className="md:col-span-2">
                <textarea
                  rows={5}
                  value={form.notes}
                  onChange={(event) =>
                    setForm({ ...form, notes: event.target.value })
                  }
                  placeholder="Формат, дивізіон, особливості сезону..."
                  className="admin-input resize-y"
                />
              </Field>
              <label className="md:col-span-2 flex cursor-pointer items-center justify-between gap-5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <span>
                  <strong className="block">Активне змагання</strong>
                  <span className="mt-1 block text-sm text-slate-500">
                    Активні змагання доступні при створенні нових матчів.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm({ ...form, isActive: event.target.checked })
                  }
                  className="h-6 w-6 accent-sky-500"
                />
              </label>
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
                    : "Створити змагання"}
              </button>
              <button
                type="button"
                onClick={closeEditor}
                disabled={isSaving}
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-slate-300 px-7 py-4 font-black text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                Скасувати
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewCard
          label="Усього змагань"
          value={overview.total}
          className="text-sky-600"
        />
        <OverviewCard
          label="Активні"
          value={overview.active}
          className="text-emerald-600"
        />
        <OverviewCard
          label="Архів"
          value={overview.archive}
          className="text-slate-500"
        />
        <OverviewCard
          label="Матчів у базі"
          value={overview.matches}
          className="text-amber-600"
        />
      </section>

      <section className="mt-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-600">
              Історія клубу
            </p>
            <h2 className="mt-2 text-3xl font-black">Сезони та турніри</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Пошук"
              className="admin-filter"
            />
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className="admin-filter"
            >
              <option value="all">Усі статуси</option>
              <option value="active">Активні</option>
              <option value="archive">Архівні</option>
            </select>
            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as TypeFilter)
              }
              className="admin-filter"
            >
              <option value="all">Усі типи</option>
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredCompetitions.length ? (
          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {filteredCompetitions.map((item) => {
              const summary = summaryByCompetition.get(item.id) ?? {
                matches: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                playersWithStats: 0,
              };
              const isProcessing = processingId === item.id;
              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="border-b border-slate-100 p-6">
                    <div className="flex items-start justify-between gap-5">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-2xl">
                          {typeIcons[item.competition_type]}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black uppercase ${item.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}
                            >
                              {item.is_active ? "Активне" : "Архів"}
                            </span>
                            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                              {typeLabels[item.competition_type]}
                            </span>
                          </div>
                          <h3 className="mt-4 text-xl font-black sm:text-2xl">
                            {item.name}
                          </h3>
                          <p className="mt-2 text-sm font-bold text-slate-500">
                            {item.season
                              ? `Сезон ${item.season}`
                              : "Сезон не вказано"}
                          </p>
                        </div>
                      </div>
                      {item.final_position && (
                        <div className="shrink-0 rounded-2xl bg-amber-100 px-4 py-3 text-center">
                          <span className="block text-xs font-black uppercase text-amber-700">
                            Місце
                          </span>
                          <strong className="mt-1 block text-2xl font-black text-amber-900">
                            {item.final_position}
                          </strong>
                        </div>
                      )}
                    </div>
                    <p className="mt-5 text-sm text-slate-500">
                      {getPeriod(item)}
                    </p>
                    {item.notes && (
                      <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                        {item.notes}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4">
                    <Metric label="Матчі" value={summary.matches} />
                    <Metric label="Перемоги" value={summary.wins} />
                    <Metric
                      label="Голи"
                      value={`${summary.goalsFor}:${summary.goalsAgainst}`}
                    />
                    <Metric
                      label="Гравці зі статистикою"
                      value={summary.playersWithStats}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 p-6">
                    <Link
                      href={`/admin/competitions/${item.id}`}
                      className="primary-button inline-flex items-center justify-center"
                    >
                      Керувати
                    </Link>

                    <button
                      type="button"
                      onClick={() => openEditForm(item)}
                      disabled={isProcessing}
                      className="secondary-button"
                    >
                      Редагувати
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleStatus(item)}
                      disabled={isProcessing}
                      className="secondary-button"
                    >
                      {isProcessing
                        ? "Обробка..."
                        : item.is_active
                          ? "До архіву"
                          : "Активувати"}
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteCompetition(item)}
                      disabled={isProcessing}
                      className="delete-button"
                    >
                      Видалити
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-lg font-black">Змагань не знайдено</p>
            <p className="mt-2 text-slate-500">
              Змініть пошук або створіть нове змагання.
            </p>
            <button
              type="button"
              onClick={openCreateForm}
              className="mt-5 rounded-full bg-slate-950 px-6 py-3 font-black text-white"
            >
              + Додати змагання
            </button>
          </div>
        )}
      </section>

      <style jsx>{`
        .admin-input,
        .admin-filter {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgb(226 232 240);
          background: rgb(248 250 252);
          padding: 0.875rem 1.25rem;
          outline: none;
        }
        .admin-input {
          margin-top: 0.75rem;
          min-height: 3.5rem;
        }
        .admin-filter {
          min-height: 3rem;
          background: white;
          font-weight: 700;
        }
        .admin-input:focus,
        .admin-filter:focus {
          border-color: rgb(56 189 248);
          background: white;
          box-shadow: 0 0 0 4px rgb(224 242 254);
        }
        .primary-button,
        .secondary-button,
        .delete-button {
          min-height: 2.5rem;
          border-radius: 9999px;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 900;
          transition: 0.2s;
        }
        .primary-button {
          background: rgb(2 6 23);
          color: white;
        }
        .primary-button:hover {
          background: rgb(14 165 233);
          color: rgb(2 6 23);
        }
        .secondary-button {
          border: 1px solid rgb(203 213 225);
          color: rgb(51 65 85);
        }
        .secondary-button:hover {
          background: rgb(241 245 249);
        }
        .delete-button {
          border: 1px solid rgb(254 202 202);
          color: rgb(185 28 28);
        }
        .delete-button:hover {
          background: rgb(254 242 242);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="block text-xs font-black uppercase tracking-[0.14em] text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function OverviewCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <strong className={`mt-3 block text-4xl font-black ${className}`}>
        {value}
      </strong>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white px-5 py-4 text-center">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <strong className="mt-2 block text-lg font-black text-slate-950">
        {value}
      </strong>
    </div>
  );
}
