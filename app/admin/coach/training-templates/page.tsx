"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

import {
  ageGroupOptions,
  intensityLabels,
} from "../training-plans/components/options";
import type {
  TrainingPlanIntensity,
  TrainingTemplateListRow,
  TrainingTemplateStatus,
} from "../training-plans/components/types";

type StatusFilter = "all" | TrainingTemplateStatus;
type IntensityFilter = "all" | TrainingPlanIntensity;
type DurationFilter = "all" | "short" | "standard" | "long";

const statusLabels: Record<TrainingTemplateStatus, string> = {
  active: "Активний",
  archived: "В архіві",
};

const statusClasses: Record<TrainingTemplateStatus, string> = {
  active: "bg-emerald-100 text-emerald-800",
  archived: "bg-slate-200 text-slate-700",
};

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Kyiv",
  }).format(new Date(value));
}

export default function TrainingTemplatesPage() {
  const [templates, setTemplates] = useState<TrainingTemplateListRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [intensityFilter, setIntensityFilter] =
    useState<IntensityFilter>("all");
  const [ageFilter, setAgeFilter] = useState("all");
  const [durationFilter, setDurationFilter] =
    useState<DurationFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("training_templates")
      .select(
        `
          id,
          title,
          team_name,
          age_group,
          objective,
          planned_duration,
          intensity,
          status,
          notes,
          source_plan_id,
          created_at,
          updated_at,
          training_template_blocks (
            id,
            duration_minutes,
            exercise_id
          )
        `,
      )
      .order("updated_at", { ascending: false });

    if (error) {
      const normalized = error.message.toLocaleLowerCase("en-US");
      setErrorMessage(
        normalized.includes("training_templates")
          ? "Не вдалося завантажити шаблони. Виконайте SQL-міграцію Sprint 05.1."
          : `Не вдалося завантажити шаблони. ${error.message}`,
      );
      setTemplates([]);
    } else {
      setTemplates((data ?? []) as unknown as TrainingTemplateListRow[]);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Initial Supabase-backed template list fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTemplates();
  }, [loadTemplates]);

  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("uk-UA");

    return templates.filter((template) => {
      const duration = Number(template.planned_duration || 0);
      const matchesDuration =
        durationFilter === "all" ||
        (durationFilter === "short" && duration <= 45) ||
        (durationFilter === "standard" && duration > 45 && duration <= 75) ||
        (durationFilter === "long" && duration > 75);
      const matchesSearch =
        !query ||
        [
          template.title,
          template.team_name ?? "",
          template.age_group ?? "",
          template.objective ?? "",
          template.notes ?? "",
        ]
          .join(" ")
          .toLocaleLowerCase("uk-UA")
          .includes(query);

      return (
        matchesSearch &&
        matchesDuration &&
        (statusFilter === "all" || template.status === statusFilter) &&
        (intensityFilter === "all" ||
          template.intensity === intensityFilter) &&
        (ageFilter === "all" || template.age_group === ageFilter)
      );
    });
  }, [
    ageFilter,
    durationFilter,
    intensityFilter,
    search,
    statusFilter,
    templates,
  ]);

  const statistics = useMemo(
    () => ({
      total: templates.length,
      active: templates.filter((template) => template.status === "active")
        .length,
      archived: templates.filter((template) => template.status === "archived")
        .length,
      blocks: templates.reduce(
        (sum, template) => sum + template.training_template_blocks.length,
        0,
      ),
    }),
    [templates],
  );

  const hasFilters =
    search.trim() !== "" ||
    statusFilter !== "active" ||
    intensityFilter !== "all" ||
    ageFilter !== "all" ||
    durationFilter !== "all";

  function resetFilters() {
    setSearch("");
    setStatusFilter("active");
    setIntensityFilter("all");
    setAgeFilter("all");
    setDurationFilter("all");
  }

  async function handleToggleArchive(template: TrainingTemplateListRow) {
    const nextStatus: TrainingTemplateStatus =
      template.status === "active" ? "archived" : "active";
    const actionLabel = nextStatus === "archived" ? "архівувати" : "відновити";

    if (!window.confirm(`${actionLabel} шаблон «${template.title}»?`)) return;

    setUpdatingId(template.id);
    setErrorMessage(null);

    const { error } = await supabase
      .from("training_templates")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", template.id);

    if (error) {
      setErrorMessage(`Не вдалося змінити статус шаблону. ${error.message}`);
      setUpdatingId(null);
      return;
    }

    setTemplates((current) =>
      current.map((item) =>
        item.id === template.id
          ? {
              ...item,
              status: nextStatus,
              updated_at: new Date().toISOString(),
            }
          : item,
      ),
    );
    setUpdatingId(null);
  }

  async function handleDelete(template: TrainingTemplateListRow) {
    if (
      !window.confirm(
        `Видалити шаблон «${template.title}»? Створені з нього плани не зміняться.`,
      )
    ) {
      return;
    }

    setDeletingId(template.id);
    setErrorMessage(null);

    const { error } = await supabase
      .from("training_templates")
      .delete()
      .eq("id", template.id);

    if (error) {
      setErrorMessage(`Не вдалося видалити шаблон. ${error.message}`);
      setDeletingId(null);
      return;
    }

    setTemplates((current) =>
      current.filter((item) => item.id !== template.id),
    );
    setDeletingId(null);
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-8 lg:px-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-400">
                Робочий простір тренера
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                Шаблони тренувань
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                Зберігайте повторювані структури сесій і створюйте з них незалежні
                плани без повторного налаштування вправ і тривалості.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/coach/training-plans"
                className="inline-flex min-h-13 items-center justify-center rounded-full border border-white/15 px-6 py-3 font-black transition hover:border-sky-400 hover:text-sky-300"
              >
                Плани тренувань
              </Link>
              <Link
                href="/admin/coach/training-templates/new"
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-sky-400 px-6 py-3 font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-300"
              >
                <span aria-hidden="true">＋</span>
                Створити шаблон
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatisticCard label="Усього шаблонів" value={statistics.total} />
          <StatisticCard label="Активні" value={statistics.active} />
          <StatisticCard label="В архіві" value={statistics.archived} />
          <StatisticCard label="Блоків у шаблонах" value={statistics.blocks} />
        </section>

        {errorMessage ? (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-800"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-bold">{errorMessage}</p>
              <button
                type="button"
                onClick={() => void loadTemplates()}
                className="rounded-full bg-rose-700 px-5 py-2 text-sm font-black text-white transition hover:bg-rose-600"
              >
                Повторити
              </button>
            </div>
          </div>
        ) : null}

        <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_180px_180px_auto]">
            <label>
              <span className="sr-only">Пошук</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Назва, команда, вік або мета..."
                className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-semibold outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
            </label>

            <FilterSelect
              label="Статус"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as StatusFilter)}
              options={[
                ["all", "Усі статуси"],
                ["active", "Активні"],
                ["archived", "В архіві"],
              ]}
            />

            <FilterSelect
              label="Інтенсивність"
              value={intensityFilter}
              onChange={(value) =>
                setIntensityFilter(value as IntensityFilter)
              }
              options={[
                ["all", "Уся інтенсивність"],
                ...Object.entries(intensityLabels),
              ]}
            />

            <FilterSelect
              label="Вікова група"
              value={ageFilter}
              onChange={setAgeFilter}
              options={[
                ["all", "Усі вікові групи"],
                ...ageGroupOptions.map((value) => [value, value] as [string, string]),
              ]}
            />

            <FilterSelect
              label="Тривалість"
              value={durationFilter}
              onChange={(value) => setDurationFilter(value as DurationFilter)}
              options={[
                ["all", "Будь-яка тривалість"],
                ["short", "До 45 хв"],
                ["standard", "46–75 хв"],
                ["long", "Понад 75 хв"],
              ]}
            />

            <button
              type="button"
              disabled={!hasFilters}
              onClick={resetFilters}
              className="min-h-12 rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Скинути
            </button>
          </div>
        </section>

        <div className="mt-5 flex items-center justify-between gap-4">
          <p className="font-bold text-slate-500">
            Знайдено: {filteredTemplates.length} із {templates.length}
          </p>
          <button
            type="button"
            onClick={() => void loadTemplates()}
            className="font-black text-sky-700 transition hover:text-sky-500"
          >
            Оновити список
          </button>
        </div>

        {isLoading ? (
          <section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-80 animate-pulse rounded-[2rem] bg-white"
              />
            ))}
          </section>
        ) : filteredTemplates.length > 0 ? (
          <section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isUpdating={updatingId === template.id}
                isDeleting={deletingId === template.id}
                onToggleArchive={() => void handleToggleArchive(template)}
                onDelete={() => void handleDelete(template)}
              />
            ))}
          </section>
        ) : (
          <section className="mt-5 rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <span className="text-5xl" aria-hidden="true">
              📚
            </span>
            <h2 className="mt-5 text-2xl font-black">
              {templates.length === 0
                ? "Ще немає шаблонів тренувань"
                : "За фільтрами нічого не знайдено"}
            </h2>
            <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-500">
              {templates.length === 0
                ? "Створіть шаблон вручну або збережіть як шаблон готовий план."
                : "Очистіть фільтри або змініть пошуковий запит."}
            </p>
            {templates.length === 0 ? (
              <Link
                href="/admin/coach/training-templates/new"
                className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-sky-400 px-6 font-black text-slate-950 transition hover:bg-sky-300"
              >
                Створити перший шаблон
              </Link>
            ) : (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-6 rounded-full border border-slate-300 px-6 py-3 font-black text-slate-700 transition hover:bg-slate-50"
              >
                Очистити фільтри
              </button>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function TemplateCard({
  template,
  isUpdating,
  isDeleting,
  onToggleArchive,
  onDelete,
}: {
  template: TrainingTemplateListRow;
  isUpdating: boolean;
  isDeleting: boolean;
  onToggleArchive: () => void;
  onDelete: () => void;
}) {
  const blocksCount = template.training_template_blocks.length;
  const blocksDuration = template.training_template_blocks.reduce(
    (sum, block) => sum + Number(block.duration_minutes || 0),
    0,
  );
  const totalDuration = blocksDuration || template.planned_duration || 0;
  const isBusy = isUpdating || isDeleting;

  return (
    <article className="flex min-h-[25rem] flex-col rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-sky-300 hover:shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${statusClasses[template.status]}`}
        >
          {statusLabels[template.status]}
        </span>
        <span className="text-xs font-bold text-slate-400">
          Оновлено {formatUpdatedAt(template.updated_at)}
        </span>
      </div>

      <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-sky-600">
        Повторно використовувана сесія
      </p>
      <h2 className="mt-2 text-2xl font-black leading-tight text-slate-950">
        {template.title}
      </h2>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
          {template.team_name || "Команда не вказана"}
        </span>
        <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">
          {template.age_group || "Вік не вказано"}
        </span>
        <span className="rounded-full bg-violet-50 px-3 py-1 text-violet-700">
          {intensityLabels[template.intensity]}
        </span>
      </div>

      {template.objective ? (
        <p className="mt-4 line-clamp-3 text-sm font-semibold leading-6 text-slate-500">
          {template.objective}
        </p>
      ) : (
        <p className="mt-4 text-sm font-semibold text-slate-400">
          Мету шаблону ще не додано.
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <CardMetric label="Блоків" value={String(blocksCount)} />
        <CardMetric label="Тривалість" value={`${totalDuration} хв`} />
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-slate-100 pt-5">
        {template.status === "active" ? (
          <Link
            href={`/admin/coach/training-plans/new?template=${template.id}`}
            className="col-span-2 inline-flex min-h-11 items-center justify-center rounded-full bg-sky-400 px-5 font-black text-slate-950 transition hover:bg-sky-300"
          >
            Створити план
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="col-span-2 inline-flex min-h-11 items-center justify-center rounded-full bg-slate-200 px-5 font-black text-slate-500"
          >
            Відновіть шаблон для використання
          </button>
        )}
        <Link
          href={`/admin/coach/training-templates/${template.id}`}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-sky-600"
        >
          Редагувати
        </Link>
        <button
          type="button"
          disabled={isBusy}
          onClick={onToggleArchive}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {isUpdating
            ? "Оновлення..."
            : template.status === "active"
              ? "В архів"
              : "Відновити"}
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={onDelete}
          className="col-span-2 inline-flex min-h-11 items-center justify-center rounded-full border border-rose-200 px-4 text-sm font-black text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
        >
          {isDeleting ? "Видалення..." : "Видалити"}
        </button>
      </div>
    </article>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-semibold outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatisticCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
    </article>
  );
}

function CardMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-black text-slate-950">{value}</p>
    </div>
  );
}
