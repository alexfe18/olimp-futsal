"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { categoryLabels } from "@/app/admin/coach/exercises/components/types";
import { supabase } from "@/lib/supabase";

import ExerciseLibraryPicker from "./ExerciseLibraryPicker";
import ExerciseQuickViewDrawer from "./ExerciseQuickViewDrawer";
import {
  ageGroupOptions,
  intensityOptions,
  statusOptions,
  trainingBlockTypeLabels,
  trainingBlockTypeOptions,
} from "./options";
import {
  createBlockFromExercise,
  createManualBlock,
  loadExerciseLibrary,
  saveTrainingPlanDraft,
} from "./training-plan-service";
import type {
  ExerciseSummary,
  TrainingPlanBlockDraft,
  TrainingPlanDraft,
  TrainingPlanIntensity,
  TrainingPlanStatus,
} from "./types";
import { useTrainingPlanUnsavedChanges } from "./useTrainingPlanUnsavedChanges";

type Props = {
  mode: "create" | "edit";
  initialDraft: TrainingPlanDraft;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type Message = {
  type: "success" | "error";
  text: string;
} | null;

function serializeDraft(draft: TrainingPlanDraft) {
  return JSON.stringify({
    title: draft.title,
    sessionDate: draft.sessionDate,
    teamName: draft.teamName,
    ageGroup: draft.ageGroup,
    objective: draft.objective,
    notes: draft.notes,
    intensity: draft.intensity,
    status: draft.status,
    blocks: draft.blocks.map((block, index) => ({
      exerciseId: block.exerciseId,
      code: block.code,
      title: block.title,
      description: block.description,
      category: block.category,
      durationMinutes: Number(block.durationMinutes),
      notes: block.notes,
      sortOrder: index,
    })),
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Kyiv",
  }).format(new Date(value));
}

function normalizeBlocks(blocks: TrainingPlanBlockDraft[]) {
  return blocks.map((block, index) => ({
    ...block,
    sortOrder: index,
  }));
}

function resolveExerciseFromLibrary(
  block: TrainingPlanBlockDraft,
  exercises: ExerciseSummary[] = [],
) {
  const directId = block.exerciseId ?? block.exercise?.id ?? null;

  if (directId) {
    return (
      block.exercise ??
      exercises.find((exercise) => exercise.id === directId) ??
      null
    );
  }

  const normalizedCode = block.code?.trim().toLocaleLowerCase("uk-UA");

  if (normalizedCode) {
    const exerciseByCode = exercises.find(
      (exercise) =>
        exercise.code?.trim().toLocaleLowerCase("uk-UA") === normalizedCode,
    );

    if (exerciseByCode) return exerciseByCode;
  }

  const normalizedTitle = block.title.trim().toLocaleLowerCase("uk-UA");

  if (!normalizedTitle) return null;

  return (
    exercises.find(
      (exercise) =>
        exercise.title.trim().toLocaleLowerCase("uk-UA") === normalizedTitle,
    ) ?? null
  );
}

function resolveExerciseId(
  block: TrainingPlanBlockDraft,
  exercises: ExerciseSummary[] = [],
) {
  return (
    block.exerciseId ??
    block.exercise?.id ??
    resolveExerciseFromLibrary(block, exercises)?.id ??
    null
  );
}

function isLibraryExerciseBlock(
  block: TrainingPlanBlockDraft,
  exercises: ExerciseSummary[] = [],
) {
  if (block.exerciseId || block.exercise?.id || block.code?.trim()) return true;
  if (block.category === "custom") return false;

  return Boolean(resolveExerciseFromLibrary(block, exercises));
}

function hydrateExerciseLinks(
  blocks: TrainingPlanBlockDraft[],
  exercises: ExerciseSummary[],
) {
  return blocks.map((block) => {
    const linkedExercise = resolveExerciseFromLibrary(block, exercises);

    if (!linkedExercise) return block;

    return {
      ...block,
      exerciseId: linkedExercise.id,
      code: block.code ?? linkedExercise.code,
      exercise: linkedExercise,
    };
  });
}

function friendlySaveError(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  const normalized = text.toLocaleLowerCase("en-US");

  if (
    normalized.includes("save_training_plan_draft") ||
    normalized.includes("session_date") ||
    normalized.includes("exercise_id") ||
    normalized.includes("planned_duration_check")
  ) {
    return "Не вдалося зберегти чернетку. Виконайте актуальну SQL-міграцію Training Builder, а потім повторіть спробу.";
  }

  return `Не вдалося зберегти чернетку. ${text}`;
}

export default function TrainingPlanBuilder({
  mode,
  initialDraft,
  createdAt = null,
  updatedAt = null,
}: Props) {
  const [draft, setDraft] = useState<TrainingPlanDraft>(initialDraft);
  const [baseline, setBaseline] = useState(() => serializeDraft(initialDraft));
  const [exercises, setExercises] = useState<ExerciseSummary[]>([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(true);
  const [exerciseError, setExerciseError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(
    updatedAt ?? null,
  );
  const [quickViewExercise, setQuickViewExercise] = useState<
    Pick<ExerciseSummary, "id" | "title" | "code" | "category"> | null
  >(null);

  const hasUnsavedChanges = serializeDraft(draft) !== baseline;
  const { navigateAfterSave, navigateSafely } =
    useTrainingPlanUnsavedChanges({
      hasUnsavedChanges,
      isSaving: isSaving || isDeleting,
    });

  const loadExercises = useCallback(async () => {
    setIsLoadingExercises(true);
    setExerciseError(null);

    try {
      const data = await loadExerciseLibrary();
      setExercises(data);
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      setExerciseError(text);
      setExercises([]);
    } finally {
      setIsLoadingExercises(false);
    }
  }, []);

  useEffect(() => {
    // Початкове клієнтське завантаження Бібліотеки вправ.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadExercises();
  }, [loadExercises]);

  const totalDuration = useMemo(
    () =>
      draft.blocks.reduce(
        (sum, block) => sum + Math.max(0, Number(block.durationMinutes) || 0),
        0,
      ),
    [draft.blocks],
  );

  const selectedCounts = useMemo(() => {
    const counts = new Map<string, number>();

    draft.blocks.forEach((block) => {
      const exerciseId = resolveExerciseId(block, exercises);
      if (!exerciseId) return;
      counts.set(exerciseId, (counts.get(exerciseId) ?? 0) + 1);
    });

    return counts;
  }, [draft.blocks, exercises]);

  function updateMetadata<K extends keyof Omit<TrainingPlanDraft, "blocks">>(
    field: K,
    value: TrainingPlanDraft[K],
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
    setMessage(null);
  }

  function addExercise(exercise: ExerciseSummary) {
    const duplicateCount = selectedCounts.get(exercise.id) ?? 0;

    if (
      duplicateCount > 0 &&
      !window.confirm(
        duplicateCount === 1
          ? `Вправа «${exercise.title}» уже додана до плану. Додати її ще раз?`
          : `Вправа «${exercise.title}» уже додана до плану ${duplicateCount} рази. Додати її ще раз?`,
      )
    ) {
      return;
    }

    setDraft((current) => ({
      ...current,
      blocks: [
        ...current.blocks,
        createBlockFromExercise(exercise, current.blocks.length),
      ],
    }));
    setMessage(null);
  }

  function addManualBlock() {
    setDraft((current) => ({
      ...current,
      blocks: [...current.blocks, createManualBlock(current.blocks.length)],
    }));
    setMessage(null);
  }

  function updateBlock(
    clientId: string,
    field:
      | "title"
      | "description"
      | "category"
      | "durationMinutes"
      | "notes",
    value: number | string,
  ) {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.map((block) =>
        block.clientId === clientId ? { ...block, [field]: value } : block,
      ),
    }));
    setMessage(null);
  }

  function removeBlock(clientId: string) {
    setDraft((current) => ({
      ...current,
      blocks: normalizeBlocks(
        current.blocks.filter((block) => block.clientId !== clientId),
      ),
    }));
    setMessage(null);
  }

  function moveBlock(clientId: string, direction: -1 | 1) {
    setDraft((current) => {
      const currentIndex = current.blocks.findIndex(
        (block) => block.clientId === clientId,
      );
      const nextIndex = currentIndex + direction;

      if (
        currentIndex < 0 ||
        nextIndex < 0 ||
        nextIndex >= current.blocks.length
      ) {
        return current;
      }

      const blocks = [...current.blocks];
      const [movedBlock] = blocks.splice(currentIndex, 1);
      blocks.splice(nextIndex, 0, movedBlock);

      return { ...current, blocks: normalizeBlocks(blocks) };
    });
    setMessage(null);
  }

  function validateDraft() {
    if (!draft.title.trim()) {
      return "Вкажіть назву тренування.";
    }

    if (draft.blocks.length === 0) {
      return "Додайте хоча б одну вправу з бібліотеки або власний блок.";
    }

    const blockWithoutTitle = draft.blocks.find(
      (block) => !block.title.trim(),
    );

    if (blockWithoutTitle) {
      return "Вкажіть назву кожного власного блоку.";
    }

    const invalidDuration = draft.blocks.find(
      (block) =>
        !Number.isFinite(Number(block.durationMinutes)) ||
        Number(block.durationMinutes) < 1 ||
        Number(block.durationMinutes) > 300,
    );

    if (invalidDuration) {
      return `Перевірте тривалість блоку «${invalidDuration.title}». Дозволено від 1 до 300 хвилин.`;
    }

    return null;
  }

  async function handleSave() {
    const validationError = validateDraft();

    if (validationError) {
      setMessage({ type: "error", text: validationError });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const normalizedBlocks = normalizeBlocks(
        hydrateExerciseLinks(draft.blocks, exercises),
      );
      const planId = await saveTrainingPlanDraft({
        ...draft,
        blocks: normalizedBlocks,
      });

      const savedDraft = {
        ...draft,
        id: planId,
        blocks: normalizedBlocks,
      };

      setDraft(savedDraft);
      setBaseline(serializeDraft(savedDraft));
      setLastSavedAt(new Date().toISOString());

      if (mode === "create") {
        navigateAfterSave(`/admin/coach/training-plans/${planId}`);
        return;
      }

      setMessage({
        type: "success",
        text: "Чернетку тренування збережено.",
      });
    } catch (error) {
      setMessage({ type: "error", text: friendlySaveError(error) });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!draft.id) return;

    if (
      !window.confirm(
        `Видалити план «${draft.title || "Без назви"}» разом з усіма блоками?`,
      )
    ) {
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    const { error } = await supabase
      .from("training_plans")
      .delete()
      .eq("id", draft.id);

    if (error) {
      setMessage({
        type: "error",
        text: `Не вдалося видалити план. ${error.message}`,
      });
      setIsDeleting(false);
      return;
    }

    setBaseline(serializeDraft(draft));
    navigateAfterSave("/admin/coach/training-plans");
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[96rem]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigateSafely("/admin/coach/training-plans")}
            className="inline-flex items-center gap-2 font-black text-sky-700 transition hover:text-sky-500"
          >
            <span aria-hidden="true">←</span>
            До планів тренувань
          </button>

          <span
            className={`rounded-full px-4 py-2 text-sm font-black shadow-sm ${
              hasUnsavedChanges
                ? "bg-amber-100 text-amber-800"
                : "bg-white text-slate-600"
            }`}
          >
            {hasUnsavedChanges ? "Є незбережені зміни" : "Усі зміни збережено"}
          </span>
        </div>

        <header className="overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-8 lg:px-10">
          <div className="flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-400">
                {mode === "create"
                  ? "Створення плану тренування"
                  : "Редагування плану тренування"}
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                {mode === "create"
                  ? "Нова тренувальна сесія"
                  : draft.title || "План тренування"}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                Складіть план вручну або додайте вправи з бібліотеки,
                налаштуйте тривалість і збережіть послідовність блоків.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(3,minmax(8.5rem,1fr))]">
              <HeaderMetric value={String(draft.blocks.length)} label="Блоків" />
              <HeaderMetric value={`${totalDuration}`} label="Хвилин" />
              <HeaderMetric
                value={draft.ageGroup || "—"}
                label="Вік"
                className="col-span-2 sm:col-span-1"
                valueClassName="whitespace-nowrap text-xl sm:text-2xl"
              />
            </div>
          </div>
        </header>

        {message ? (
          <div
            role={message.type === "error" ? "alert" : "status"}
            className={`mt-6 rounded-2xl border px-5 py-4 font-bold ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <p>{message.text}</p>
              <button
                type="button"
                aria-label="Закрити повідомлення"
                onClick={() => setMessage(null)}
                className="shrink-0 text-xl leading-none opacity-60 hover:opacity-100"
              >
                ×
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(24rem,0.65fr)]">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <SectionHeading
                eyebrow="01 · Метадані"
                title="Основна інформація"
                description="Дані чернетки можна доповнювати поступово. Для збереження потрібні назва та хоча б одна вправа або власний блок."
              />

              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <Field label="Назва тренування *">
                  <input
                    value={draft.title}
                    onChange={(event) =>
                      updateMetadata("title", event.target.value)
                    }
                    placeholder="Наприклад: Вихід із пресингу та завершення"
                    className="input-control"
                  />
                </Field>

                <Field label="Дата">
                  <input
                    type="date"
                    value={draft.sessionDate}
                    onChange={(event) =>
                      updateMetadata("sessionDate", event.target.value)
                    }
                    className="input-control"
                  />
                </Field>

                <Field label="Команда">
                  <input
                    value={draft.teamName}
                    onChange={(event) =>
                      updateMetadata("teamName", event.target.value)
                    }
                    placeholder="Олімп Футзал"
                    className="input-control"
                  />
                </Field>

                <Field label="Вікова група">
                  <select
                    value={draft.ageGroup}
                    onChange={(event) =>
                      updateMetadata("ageGroup", event.target.value)
                    }
                    className="input-control"
                  >
                    <option value="">Не вказано</option>
                    {ageGroupOptions.map((ageGroup) => (
                      <option key={ageGroup} value={ageGroup}>
                        {ageGroup}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Інтенсивність">
                  <select
                    value={draft.intensity}
                    onChange={(event) =>
                      updateMetadata(
                        "intensity",
                        event.target.value as TrainingPlanIntensity,
                      )
                    }
                    className="input-control"
                  >
                    {intensityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>

                {mode === "edit" ? (
                  <Field label="Статус">
                    <select
                      value={draft.status}
                      onChange={(event) =>
                        updateMetadata(
                          "status",
                          event.target.value as TrainingPlanStatus,
                        )
                      }
                      className="input-control"
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <Field label="Головна мета">
                  <textarea
                    rows={4}
                    value={draft.objective}
                    onChange={(event) =>
                      updateMetadata("objective", event.target.value)
                    }
                    placeholder="Який принцип або ігрову фазу потрібно покращити?"
                    className="input-control resize-y"
                  />
                </Field>

                <Field label="Нотатки тренера">
                  <textarea
                    rows={4}
                    value={draft.notes}
                    onChange={(event) =>
                      updateMetadata("notes", event.target.value)
                    }
                    placeholder="Інвентар, обмеження, склад, організаційні деталі..."
                    className="input-control resize-y"
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <SectionHeading
                  eyebrow="02 · Структура"
                  title="Послідовність вправ"
                  description="Змінюйте порядок, тривалість і короткі нотатки до кожної вправи."
                />

                <div className="flex flex-wrap items-stretch gap-3 sm:justify-end">
                  <button
                    type="button"
                    onClick={addManualBlock}
                    className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-white px-5 font-black text-sky-700 transition hover:border-sky-400 hover:bg-sky-50"
                  >
                    <span aria-hidden="true">＋</span>
                    Додати власний блок
                  </button>

                  <div className="rounded-2xl bg-sky-50 px-5 py-4 text-right ring-1 ring-sky-100">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">
                      Загальний час
                    </p>
                    <p className="mt-1 text-3xl font-black text-sky-950">
                      {totalDuration} хв
                    </p>
                  </div>
                </div>
              </div>

              {draft.blocks.length === 0 ? (
                <div className="mt-6 rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                  <span className="text-4xl" aria-hidden="true">
                    🧩
                  </span>
                  <h3 className="mt-4 text-xl font-black text-slate-950">
                    План поки порожній
                  </h3>
                  <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                    Оберіть вправу в бібліотеці праворуч або створіть власний
                    блок. Обидва типи можна поєднувати в одному плані.
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {draft.blocks.map((block, index) => (
                    <article
                      key={block.clientId}
                      className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 sm:p-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
                            {index + 1}
                          </span>
                          <span className="max-w-full truncate rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
                            {block.code?.trim() || "ВЛАСНИЙ БЛОК"}
                          </span>
                          <span className="max-w-full truncate rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-700">
                            {trainingBlockTypeLabels[block.category] ??
                              categoryLabels[block.category] ??
                              block.category}
                          </span>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveBlock(block.clientId, -1)}
                            className="order-button"
                            aria-label={`Перемістити вправу «${block.title}» вище`}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={index === draft.blocks.length - 1}
                            onClick={() => moveBlock(block.clientId, 1)}
                            className="order-button"
                            aria-label={`Перемістити вправу «${block.title}» нижче`}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => removeBlock(block.clientId)}
                            className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-black text-rose-700 transition hover:bg-rose-50"
                          >
                            Видалити
                          </button>
                        </div>
                      </div>

                      {isLibraryExerciseBlock(block, exercises) ? (
                        <div className="mt-4 min-w-0">
                          <h3 className="break-words text-xl font-black leading-tight text-slate-950">
                            {block.title}
                          </h3>
                          {block.description ? (
                            <p className="mt-2 line-clamp-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                              {block.description}
                            </p>
                          ) : null}

                          <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-200 pt-4">
                            <button
                              type="button"
                              disabled={!resolveExerciseId(block, exercises)}
                              title={
                                resolveExerciseId(block, exercises)
                                  ? undefined
                                  : "Посилання на вправу відновлюється після завантаження бібліотеки."
                              }
                              onClick={() => {
                                const exerciseId = resolveExerciseId(
                                  block,
                                  exercises,
                                );
                                if (!exerciseId) return;

                                setQuickViewExercise({
                                  id: exerciseId,
                                  title: block.title,
                                  code: block.code,
                                  category: block.category,
                                });
                              }}
                              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-sky-400 px-5 text-sm font-black text-slate-950 transition hover:bg-sky-300 disabled:cursor-wait disabled:opacity-50"
                            >
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-5 w-5 shrink-0"
                              >
                                <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12Z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                              Переглянути вправу
                            </button>
                            {resolveExerciseId(block, exercises) ? (
                              <Link
                                href={`/admin/coach/exercises/${resolveExerciseId(
                                  block,
                                  exercises,
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-black text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
                              >
                                Відкрити сторінку ↗
                              </Link>
                            ) : (
                              <span
                                aria-disabled="true"
                                className="inline-flex min-h-11 cursor-wait items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-black text-slate-400"
                              >
                                Відкрити сторінку ↗
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-[minmax(0,1.35fr)_minmax(15rem,0.65fr)]">
                          <Field label="Назва власного блоку">
                            <input
                              value={block.title}
                              onChange={(event) =>
                                updateBlock(
                                  block.clientId,
                                  "title",
                                  event.target.value,
                                )
                              }
                              placeholder="Наприклад: Розминка з мʼячем"
                              className="input-control"
                            />
                          </Field>

                          <Field label="Тип блоку">
                            <select
                              value={block.category}
                              onChange={(event) =>
                                updateBlock(
                                  block.clientId,
                                  "category",
                                  event.target.value,
                                )
                              }
                              className="input-control"
                            >
                              {trainingBlockTypeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </Field>

                          <div className="min-w-0 md:col-span-2">
                            <Field label="Опис / зміст блоку">
                              <textarea
                                rows={3}
                                value={block.description ?? ""}
                                onChange={(event) =>
                                  updateBlock(
                                    block.clientId,
                                    "description",
                                    event.target.value,
                                  )
                                }
                                placeholder="Опишіть вправу, організацію, серії або послідовність дій..."
                                className="input-control resize-y"
                              />
                            </Field>
                          </div>
                        </div>
                      )}

                      <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-[minmax(10rem,0.32fr)_minmax(0,1fr)]">
                        <Field label="Тривалість">
                          <div className="relative min-w-0">
                            <input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              max={300}
                              value={block.durationMinutes}
                              onChange={(event) =>
                                updateBlock(
                                  block.clientId,
                                  "durationMinutes",
                                  event.target.value === ""
                                    ? ""
                                    : Number(event.target.value),
                                )
                              }
                              className="input-control duration-input pr-14"
                            />
                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                              хв
                            </span>
                          </div>
                        </Field>

                        <Field
                          label={
                            block.exerciseId
                              ? "Нотатки до вправи"
                              : "Нотатки до блоку"
                          }
                        >
                          <input
                            value={block.notes}
                            onChange={(event) =>
                              updateBlock(
                                block.clientId,
                                "notes",
                                event.target.value,
                              )
                            }
                            placeholder="Ключові акценти, обмеження або інвентар..."
                            className="input-control"
                          />
                        </Field>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <ExerciseLibraryPicker
              exercises={exercises}
              selectedCounts={selectedCounts}
              isLoading={isLoadingExercises}
              errorMessage={exerciseError}
              onRetry={() => void loadExercises()}
              onAdd={addExercise}
            />

            <section className="rounded-[2rem] bg-slate-950 p-5 text-white shadow-xl sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">
                Чернетка
              </p>
              <h2 className="mt-3 text-2xl font-black">
                {totalDuration} хв · {draft.blocks.length} блоків
              </h2>

              <div className="mt-5 space-y-3 text-sm">
                <SideMetric label="Команда" value={draft.teamName || "—"} />
                <SideMetric label="Вік" value={draft.ageGroup || "—"} />
                <SideMetric label="Дата" value={draft.sessionDate || "—"} />
                {mode === "edit" ? (
                  <>
                    <SideMetric label="Створено" value={formatDateTime(createdAt)} />
                    <SideMetric label="Оновлено" value={formatDateTime(lastSavedAt)} />
                  </>
                ) : null}
              </div>

              <button
                type="button"
                disabled={isSaving || isDeleting}
                onClick={() => void handleSave()}
                className="mt-6 inline-flex min-h-13 w-full items-center justify-center rounded-full bg-sky-400 px-6 font-black text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving
                  ? "Збереження..."
                  : mode === "create"
                    ? "Зберегти чернетку"
                    : "Зберегти зміни"}
              </button>

              <button
                type="button"
                disabled={isSaving || isDeleting}
                onClick={() =>
                  navigateSafely("/admin/coach/training-plans")
                }
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-white/15 px-5 text-sm font-black text-white transition hover:border-sky-400 hover:text-sky-300 disabled:opacity-50"
              >
                Скасувати
              </button>

              {mode === "edit" ? (
                <button
                  type="button"
                  disabled={isSaving || isDeleting}
                  onClick={() => void handleDelete()}
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-rose-400/40 px-5 text-sm font-black text-rose-300 transition hover:bg-rose-400/10 disabled:opacity-50"
                >
                  {isDeleting ? "Видалення..." : "Видалити план"}
                </button>
              ) : null}
            </section>
          </aside>
        </div>
      </div>

      {quickViewExercise ? (
        <ExerciseQuickViewDrawer
          exercise={quickViewExercise}
          onClose={() => setQuickViewExercise(null)}
        />
      ) : null}

      <style jsx global>{`
        .input-control {
          min-height: 3.25rem;
          min-width: 0;
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgb(226 232 240);
          background: white;
          padding: 0.75rem 1rem;
          font-weight: 600;
          color: rgb(15 23 42);
          outline: none;
          transition: border-color 150ms, box-shadow 150ms;
        }

        .input-control:focus {
          border-color: rgb(56 189 248);
          box-shadow: 0 0 0 4px rgb(224 242 254);
        }

        .input-control::placeholder {
          color: rgb(148 163 184);
        }

        .duration-input {
          appearance: textfield;
          -moz-appearance: textfield;
        }

        .duration-input::-webkit-outer-spin-button,
        .duration-input::-webkit-inner-spin-button {
          margin: 0;
          -webkit-appearance: none;
        }

        .order-button {
          display: inline-flex;
          min-height: 2.5rem;
          min-width: 2.5rem;
          align-items: center;
          justify-content: center;
          border-radius: 9999px;
          border: 1px solid rgb(203 213 225);
          background: white;
          font-weight: 900;
          color: rgb(51 65 85);
          transition: background-color 150ms;
        }

        .order-button:hover:not(:disabled) {
          background: rgb(240 249 255);
        }

        .order-button:disabled {
          cursor: not-allowed;
          opacity: 0.3;
        }
      `}</style>
    </main>
  );
}

function HeaderMetric({
  value,
  label,
  className = "",
  valueClassName = "text-2xl",
}: {
  value: string;
  label: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div
      className={`min-w-0 rounded-2xl bg-white/10 px-3 py-4 text-center sm:px-4 ${className}`}
    >
      <p className={`${valueClassName} break-words font-black leading-tight`}>
        {value}
      </p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
        {title}
      </h2>
      <p className="mt-3 max-w-3xl leading-7 text-slate-500">{description}</p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block font-black text-slate-800">{label}</span>
      {children}
    </label>
  );
}

function SideMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-white/[0.06] px-4 py-3">
      <span className="font-bold text-slate-400">{label}</span>
      <span className="max-w-[60%] text-right font-black text-white">{value}</span>
    </div>
  );
}
