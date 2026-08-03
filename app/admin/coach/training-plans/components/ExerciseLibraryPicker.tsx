"use client";

import { useMemo, useState } from "react";

import {
  categoryLabels,
  difficultyLabels,
  playersLabel,
} from "@/app/admin/coach/exercises/components/types";

import type { ExerciseSummary } from "./types";

type Props = {
  exercises: ExerciseSummary[];
  selectedCounts: Map<string, number>;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onAdd: (exercise: ExerciseSummary) => void;
};

export default function ExerciseLibraryPicker({
  exercises,
  selectedCounts,
  isLoading,
  errorMessage,
  onRetry,
  onAdd,
}: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(() => {
    return Array.from(new Set(exercises.map((exercise) => exercise.category))).sort(
      (first, second) =>
        (categoryLabels[first] ?? first).localeCompare(
          categoryLabels[second] ?? second,
          "uk",
        ),
    );
  }, [exercises]);

  const filteredExercises = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("uk-UA");

    return exercises.filter((exercise) => {
      const matchesCategory =
        category === "all" || exercise.category === category;
      const matchesSearch =
        !query ||
        [
          exercise.code ?? "",
          exercise.title,
          exercise.category,
          categoryLabels[exercise.category] ?? "",
        ]
          .join(" ")
          .toLocaleLowerCase("uk-UA")
          .includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [category, exercises, search]);

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
            Бібліотека вправ
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Додати вправу
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Оберіть активну вправу. Її тривалість можна змінити в плані.
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">
          {filteredExercises.length} вправ
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
        <label className="block">
          <span className="sr-only">Пошук вправи</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Код або назва вправи..."
            className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
          />
        </label>

        <label className="block">
          <span className="sr-only">Категорія</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-semibold text-slate-950 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
          >
            <option value="all">Усі категорії</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {categoryLabels[item] ?? item}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? (
        <div className="mt-5 space-y-3" aria-label="Завантаження бібліотеки">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl bg-slate-100"
            />
          ))}
        </div>
      ) : errorMessage ? (
        <div role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <p className="font-black text-rose-800">
            Не вдалося завантажити бібліотеку вправ.
          </p>
          <p className="mt-2 text-sm leading-6 text-rose-700">{errorMessage}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-full bg-rose-700 px-5 py-2.5 text-sm font-black text-white transition hover:bg-rose-600"
          >
            Повторити
          </button>
        </div>
      ) : filteredExercises.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <p className="font-black text-slate-800">Вправ не знайдено</p>
          <p className="mt-2 text-sm text-slate-500">
            Змініть пошук або категорію.
          </p>
        </div>
      ) : (
        <div className="mt-5 max-h-[42rem] space-y-3 overflow-y-auto pr-1">
          {filteredExercises.map((exercise) => {
            const selectedCount = selectedCounts.get(exercise.id) ?? 0;

            return (
              <article
                key={exercise.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-sky-300 hover:bg-sky-50/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                        {exercise.code?.trim() || "Без коду"}
                      </span>
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-700">
                        {categoryLabels[exercise.category] ?? exercise.category}
                      </span>
                      {selectedCount > 0 ? (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                          У плані: {selectedCount}
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-3 text-lg font-black leading-snug text-slate-950">
                      {exercise.title}
                    </h3>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-slate-500">
                      <span>⏱ {exercise.duration_minutes} хв</span>
                      <span>
                        ◇ {difficultyLabels[exercise.difficulty] ?? exercise.difficulty}
                      </span>
                      <span>
                        👥 {playersLabel(exercise.min_players, exercise.max_players)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onAdd(exercise)}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-sky-400 px-4 text-sm font-black text-slate-950 transition hover:bg-sky-300"
                  >
                    {selectedCount > 0 ? "+ Ще раз" : "+ Додати"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
