"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

import {
  intensityLabels,
  statusClasses,
  statusLabels,
} from "./components/options";
import {
  createTrainingTemplateFromPlan,
  duplicateTrainingPlan,
} from "./components/training-plan-service";
import type {
  TrainingPlanIntensity,
  TrainingPlanListRow,
  TrainingPlanStatus,
} from "./components/types";

type StatusFilter = "all" | TrainingPlanStatus;
type IntensityFilter = "all" | TrainingPlanIntensity;

function formatDate(value: string | null) {
  if (!value) return "Дата не вказана";

  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Kyiv",
  }).format(new Date(`${value}T12:00:00`));
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Kyiv",
  }).format(new Date(value));
}

export default function TrainingPlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<TrainingPlanListRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [intensityFilter, setIntensityFilter] =
    useState<IntensityFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [templatingId, setTemplatingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { data, error } = await supabase
      .from("training_plans")
      .select(
        `
          id,
          title,
          session_date,
          team_name,
          age_group,
          objective,
          planned_duration,
          intensity,
          status,
          notes,
          created_at,
          updated_at,
          training_plan_blocks (
            id,
            duration_minutes,
            exercise_id
          )
        `,
      )
      .order("session_date", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false });

    if (error) {
      const normalized = error.message.toLocaleLowerCase("en-US");
      setErrorMessage(
        normalized.includes("session_date") ||
          normalized.includes("exercise_id")
          ? "Список не завантажено. Виконайте актуальну SQL-міграцію Training Builder."
          : `Не вдалося завантажити плани тренувань. ${error.message}`,
      );
      setPlans([]);
    } else {
      setPlans((data ?? []) as unknown as TrainingPlanListRow[]);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Initial client-side fetch for the Supabase-backed training plans.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPlans();
  }, [loadPlans]);

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("uk-UA");

    return plans.filter((plan) => {
      const matchesSearch =
        !query ||
        [
          plan.title,
          plan.team_name ?? "",
          plan.age_group ?? "",
          plan.objective ?? "",
          plan.notes ?? "",
        ]
          .join(" ")
          .toLocaleLowerCase("uk-UA")
          .includes(query);

      return (
        matchesSearch &&
        (statusFilter === "all" || plan.status === statusFilter) &&
        (intensityFilter === "all" || plan.intensity === intensityFilter)
      );
    });
  }, [intensityFilter, plans, search, statusFilter]);

  const statistics = useMemo(() => {
    return {
      total: plans.length,
      drafts: plans.filter((plan) => plan.status === "draft").length,
      exercises: plans.reduce(
        (sum, plan) =>
          sum +
          plan.training_plan_blocks.filter((block) => block.exercise_id !== null)
            .length,
        0,
      ),
      minutes: plans.reduce(
        (sum, plan) => sum + Number(plan.planned_duration || 0),
        0,
      ),
    };
  }, [plans]);

  async function handleDelete(plan: TrainingPlanListRow) {
    if (!window.confirm(`Видалити план «${plan.title}»?`)) return;

    setDeletingId(plan.id);
    setErrorMessage(null);

    const { error } = await supabase
      .from("training_plans")
      .delete()
      .eq("id", plan.id);

    if (error) {
      setErrorMessage(`Не вдалося видалити план. ${error.message}`);
      setDeletingId(null);
      return;
    }

    setPlans((current) => current.filter((item) => item.id !== plan.id));
    setDeletingId(null);
  }

  async function handleDuplicate(plan: TrainingPlanListRow) {
    const requestedTitle = window.prompt(
      "Назва копії плану",
      `Копія — ${plan.title}`,
    );

    if (requestedTitle === null) return;

    if (!requestedTitle.trim()) {
      setErrorMessage("Вкажіть назву копії плану.");
      return;
    }

    setDuplicatingId(plan.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const planId = await duplicateTrainingPlan(plan.id, requestedTitle);
      router.push(`/admin/coach/training-plans/${planId}`);
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      setErrorMessage(`Не вдалося дублювати план. ${text}`);
      setDuplicatingId(null);
    }
  }

  async function handleCreateTemplate(plan: TrainingPlanListRow) {
    const requestedTitle = window.prompt(
      "Назва нового шаблону",
      `Шаблон — ${plan.title}`,
    );

    if (requestedTitle === null) return;

    if (!requestedTitle.trim()) {
      setErrorMessage("Вкажіть назву шаблону.");
      return;
    }

    setTemplatingId(plan.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const templateId = await createTrainingTemplateFromPlan(
        plan.id,
        requestedTitle,
      );
      setTemplatingId(null);

      if (
        window.confirm(
          "Шаблон створено. Відкрити його для перевірки та редагування?",
        )
      ) {
        router.push(`/admin/coach/training-templates/${templateId}`);
        return;
      }

      setSuccessMessage(`Шаблон «${requestedTitle.trim()}» створено.`);
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      setErrorMessage(`Не вдалося створити шаблон. ${text}`);
      setTemplatingId(null);
    }
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setIntensityFilter("all");
  }

  const hasFilters =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    intensityFilter !== "all";

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
                Плани тренувань
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                Створюйте плани вручну або збирайте їх із вправ бібліотеки,
                поєднуючи обидва підходи в одній тренувальній сесії.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/coach/training-templates"
                className="inline-flex min-h-13 shrink-0 items-center justify-center rounded-full border border-white/15 px-6 py-3 font-black text-white transition hover:-translate-y-0.5 hover:border-sky-400 hover:text-sky-300"
              >
                Шаблони тренувань
              </Link>
              <Link
                href="/admin/coach/training-plans/new"
                className="inline-flex min-h-13 shrink-0 items-center justify-center gap-2 rounded-full bg-sky-400 px-6 py-3 font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-300"
              >
                <span aria-hidden="true">＋</span>
                Створити план
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatisticCard label="Усього планів" value={statistics.total} />
          <StatisticCard label="Чернетки" value={statistics.drafts} />
          <StatisticCard label="Додано блоків" value={statistics.exercises} />
          <StatisticCard
            label="Загальний час"
            value={statistics.minutes}
            suffix=" хв"
          />
        </section>

        {successMessage ? (
          <div
            role="status"
            className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 font-bold text-emerald-800"
          >
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div role="alert" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-bold">{errorMessage}</p>
              <button
                type="button"
                onClick={() => void loadPlans()}
                className="rounded-full bg-rose-700 px-5 py-2 text-sm font-black text-white transition hover:bg-rose-600"
              >
                Повторити
              </button>
            </div>
          </div>
        ) : null}

        <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
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

            <label>
              <span className="sr-only">Статус</span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
                className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-semibold outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
              >
                <option value="all">Усі статуси</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="sr-only">Інтенсивність</span>
              <select
                value={intensityFilter}
                onChange={(event) =>
                  setIntensityFilter(event.target.value as IntensityFilter)
                }
                className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-semibold outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
              >
                <option value="all">Уся інтенсивність</option>
                {Object.entries(intensityLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              disabled={!hasFilters}
              onClick={resetFilters}
              className="min-h-12 rounded-full border border-slate-300 px-5 font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Очистити
            </button>
          </div>
        </section>

        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="font-black text-slate-600">
            Знайдено: {filteredPlans.length}
            {plans.length > 0 ? ` із ${plans.length}` : ""}
          </p>
          <button
            type="button"
            onClick={() => void loadPlans()}
            disabled={isLoading}
            className="font-black text-sky-700 transition hover:text-sky-500 disabled:opacity-50"
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
        ) : filteredPlans.length > 0 ? (
          <section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isDeleting={deletingId === plan.id}
                isDuplicating={duplicatingId === plan.id}
                isTemplating={templatingId === plan.id}
                onDelete={() => void handleDelete(plan)}
                onDuplicate={() => void handleDuplicate(plan)}
                onCreateTemplate={() => void handleCreateTemplate(plan)}
              />
            ))}
          </section>
        ) : (
          <section className="mt-5 rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <span className="text-5xl" aria-hidden="true">
              🗂️
            </span>
            <h2 className="mt-5 text-2xl font-black">
              {plans.length === 0
                ? "Ще немає планів тренувань"
                : "За фільтрами нічого не знайдено"}
            </h2>
            <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-500">
              {plans.length === 0
                ? "Створіть першу чернетку та додайте вправи з бібліотеки."
                : "Очистіть фільтри або змініть пошуковий запит."}
            </p>
            {plans.length === 0 ? (
              <Link
                href="/admin/coach/training-plans/new"
                className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-sky-400 px-6 font-black text-slate-950 transition hover:bg-sky-300"
              >
                Створити перший план
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

function PlanCard({
  plan,
  isDeleting,
  isDuplicating,
  isTemplating,
  onDelete,
  onDuplicate,
  onCreateTemplate,
}: {
  plan: TrainingPlanListRow;
  isDeleting: boolean;
  isDuplicating: boolean;
  isTemplating: boolean;
  onDelete: () => void;
  onDuplicate: () => void;
  onCreateTemplate: () => void;
}) {
  const exerciseCount = plan.training_plan_blocks.length;
  const blocksDuration = plan.training_plan_blocks.reduce(
    (sum, block) => sum + Number(block.duration_minutes || 0),
    0,
  );
  const totalDuration = blocksDuration || plan.planned_duration || 0;

  return (
    <article className="flex min-h-[22rem] flex-col rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-sky-300 hover:shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${statusClasses[plan.status]}`}
        >
          {statusLabels[plan.status]}
        </span>
        <span className="text-xs font-bold text-slate-400">
          Оновлено {formatUpdatedAt(plan.updated_at)}
        </span>
      </div>

      <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-sky-600">
        {formatDate(plan.session_date)}
      </p>
      <h2 className="mt-2 text-2xl font-black leading-tight text-slate-950">
        {plan.title}
      </h2>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
          {plan.team_name || "Команда не вказана"}
        </span>
        <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">
          {plan.age_group || "Вік не вказано"}
        </span>
        <span className="rounded-full bg-violet-50 px-3 py-1 text-violet-700">
          {intensityLabels[plan.intensity]}
        </span>
      </div>

      {plan.objective ? (
        <p className="mt-4 line-clamp-3 text-sm font-semibold leading-6 text-slate-500">
          {plan.objective}
        </p>
      ) : (
        <p className="mt-4 text-sm font-semibold text-slate-400">
          Мету тренування ще не додано.
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <CardMetric label="Вправ" value={String(exerciseCount)} />
        <CardMetric label="Тривалість" value={`${totalDuration} хв`} />
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-slate-100 pt-5">
        <Link
          href={`/admin/coach/training-plans/${plan.id}`}
          className="col-span-2 inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 font-black text-white transition hover:bg-sky-600"
        >
          Відкрити
        </Link>
        <button
          type="button"
          disabled={isDeleting || isDuplicating || isTemplating}
          onClick={onDuplicate}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-sky-200 px-4 text-sm font-black text-sky-700 transition hover:bg-sky-50 disabled:opacity-50"
        >
          {isDuplicating ? "Копіювання..." : "Дублювати"}
        </button>
        <button
          type="button"
          disabled={isDeleting || isDuplicating || isTemplating}
          onClick={onCreateTemplate}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-emerald-200 px-4 text-sm font-black text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
        >
          {isTemplating ? "Створення..." : "У шаблон"}
        </button>
        <button
          type="button"
          disabled={isDeleting || isDuplicating || isTemplating}
          onClick={onDelete}
          className="col-span-2 inline-flex min-h-11 items-center justify-center rounded-full border border-rose-200 px-4 text-sm font-black text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
        >
          {isDeleting ? "Видалення..." : "Видалити"}
        </button>
      </div>
    </article>
  );
}

function StatisticCard({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black text-slate-950">
        {value}
        {suffix}
      </p>
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
