"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

import CategoryChips from "./components/CategoryChips";
import EmptyLibraryState from "./components/EmptyLibraryState";
import ExerciseCard from "./components/ExerciseCard";
import ExerciseFilters from "./components/ExerciseFilters";
import ExerciseStats from "./components/ExerciseStats";
import PageHero from "./components/PageHero";

import type { ExerciseRow, ExerciseStatus } from "./components/types";

export default function ExercisesLibraryPage() {
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");

  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const loadExercises = useCallback(async () => {
    setIsLoading(true);
    setMessage("");
    setMessageType("");

    const { data, error } = await supabase
      .from("exercises")
      .select(
        `
          id,
          code,
          title,
          description,
          organization,
          coaching_points,
          common_mistakes,
          equipment,
          category,
          exercise_type,
          subcategory,
          player_format,
          min_players,
          max_players,
          duration_minutes,
          difficulty,
          intensity,
          age_groups,
          field_size,
          cover_image_path,
          diagram_image_path,
          video_path,
          external_video_url,
          primary_goal,
          progression,
          regression,
          alternative,
          load_control,
          status,
          library_tier,
          is_system,
          source,
          published_at,
          created_by,
          created_at,
          updated_at,
          exercise_goals(id, goal),
          exercise_tags(id, tag)
        `,
      )
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Exercises loading error:", error);

      setMessage("Не вдалося завантажити бібліотеку вправ.");
      setMessageType("error");
      setExercises([]);
    } else {
      setExercises((data ?? []) as ExerciseRow[]);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Initial client-side fetch for the Supabase-backed library.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadExercises();
  }, [loadExercises]);

  const stats = useMemo(
    () => ({
      total: exercises.length,
      active: exercises.filter((exercise) => exercise.status === "active")
        .length,
      draft: exercises.filter((exercise) => exercise.status === "draft").length,
      archived: exercises.filter((exercise) => exercise.status === "archived")
        .length,
    }),
    [exercises],
  );

  const hasActiveFilters =
    search.trim() !== "" ||
    category !== "all" ||
    type !== "all" ||
    status !== "all";

  const filteredExercises = useMemo(() => {
    const query = search.trim().toLowerCase();

    return exercises.filter((exercise) => {
      const searchableContent = [
        exercise.code ?? "",
        exercise.title,
        exercise.description ?? "",
        exercise.organization ?? "",
        exercise.category,
        exercise.subcategory ?? "",
        exercise.exercise_type,
        exercise.primary_goal ?? "",
        exercise.player_format ?? "",
        exercise.source ?? "",
        ...exercise.exercise_goals.map((goal) => goal.goal),
        ...exercise.exercise_tags.map((tag) => tag.tag),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = query === "" || searchableContent.includes(query);

      const matchesCategory =
        category === "all" || exercise.category === category;

      const matchesType = type === "all" || exercise.exercise_type === type;

      const matchesStatus = status === "all" || exercise.status === status;

      return matchesSearch && matchesCategory && matchesType && matchesStatus;
    });
  }, [exercises, search, category, type, status]);

  function resetFilters() {
    setSearch("");
    setCategory("all");
    setType("all");
    setStatus("all");
  }

  async function toggleArchive(exercise: ExerciseRow) {
    const nextStatus: ExerciseStatus =
      exercise.status === "archived" ? "draft" : "archived";

    const confirmationMessage =
      nextStatus === "archived"
        ? `Перемістити вправу «${exercise.title}» до архіву?`
        : `Повернути вправу «${exercise.title}» з архіву?`;

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    setProcessingId(exercise.id);
    setMessage("");
    setMessageType("");

    const { error } = await supabase
      .from("exercises")
      .update({
        status: nextStatus,
      })
      .eq("id", exercise.id);

    if (error) {
      console.error("Exercise archive error:", error);

      setMessage("Не вдалося змінити статус вправи.");
      setMessageType("error");
    } else {
      setMessage(
        nextStatus === "archived"
          ? "Вправу переміщено до архіву."
          : "Вправу повернено з архіву.",
      );
      setMessageType("success");

      await loadExercises();
    }

    setProcessingId(null);
  }

  async function deleteExercise(exercise: ExerciseRow) {
    const shouldDelete = window.confirm(
      `Назавжди видалити вправу «${exercise.title}»? Цю дію неможливо скасувати.`,
    );

    if (!shouldDelete) {
      return;
    }

    setProcessingId(exercise.id);
    setMessage("");
    setMessageType("");

    const { error } = await supabase
      .from("exercises")
      .delete()
      .eq("id", exercise.id);

    if (error) {
      console.error("Exercise delete error:", error);

      setMessage(
        error.code === "23503"
          ? "Вправа вже використовується у тренувальному плані. Перемістіть її до архіву."
          : "Не вдалося видалити вправу.",
      );
      setMessageType("error");
    } else {
      setMessage("Вправу успішно видалено.");
      setMessageType("success");

      await loadExercises();
    }

    setProcessingId(null);
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="h-56 animate-pulse rounded-[2rem] bg-slate-950" />

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-3xl bg-white"
              />
            ))}
          </div>

          <div className="mt-6 h-24 animate-pulse rounded-[2rem] bg-white" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <PageHero
          eyebrow="Робочий простір тренера"
          title="Бібліотека вправ"
          description="Створюйте вправи один раз, систематизуйте їх за категоріями та використовуйте у різних тренувальних планах."
          actions={
            <>
              <Link
                href="/admin/coach/exercises/import"
                className="inline-flex min-h-13 items-center justify-center rounded-full border border-white/20 bg-white/10 px-7 font-black text-white transition hover:bg-white/15"
              >
                Імпортувати вправи
              </Link>
              <Link
                href="/admin/coach/exercises/new"
                className="inline-flex min-h-13 items-center justify-center rounded-full bg-sky-400 px-7 font-black text-slate-950 transition hover:bg-sky-300"
              >
                + Створити вправу
              </Link>
            </>
          }
        />

        {message ? (
          <div
            role={messageType === "error" ? "alert" : "status"}
            className={`mt-6 rounded-2xl border px-5 py-4 font-bold ${
              messageType === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <p>{message}</p>

              <button
                type="button"
                aria-label="Закрити повідомлення"
                onClick={() => {
                  setMessage("");
                  setMessageType("");
                }}
                className="shrink-0 text-lg leading-none opacity-60 transition hover:opacity-100"
              >
                ×
              </button>
            </div>
          </div>
        ) : null}

        <ExerciseStats stats={stats} />

        <CategoryChips value={category} onChange={setCategory} />

        <ExerciseFilters
          search={search}
          category={category}
          type={type}
          status={status}
          hasActiveFilters={hasActiveFilters}
          onSearchChange={setSearch}
          onCategoryChange={setCategory}
          onTypeChange={setType}
          onStatusChange={setStatus}
          onReset={resetFilters}
        />

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-black text-slate-600">
            Знайдено: {filteredExercises.length}
            {exercises.length > 0 ? ` із ${exercises.length}` : ""}
          </p>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => void loadExercises()}
            className="self-start font-black text-sky-700 transition hover:text-sky-900 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
          >
            Оновити список
          </button>
        </div>

        {filteredExercises.length > 0 ? (
          <section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredExercises.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                isProcessing={processingId === exercise.id}
                onArchive={(selectedExercise) => {
                  void toggleArchive(selectedExercise);
                }}
                onDelete={(selectedExercise) => {
                  void deleteExercise(selectedExercise);
                }}
              />
            ))}
          </section>
        ) : (
          <EmptyLibraryState
            isLibraryEmpty={exercises.length === 0}
            onResetFilters={resetFilters}
          />
        )}
      </div>
    </main>
  );
}
