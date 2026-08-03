import Image from "next/image";
import Link from "next/link";

import { supabase } from "@/lib/supabase";

import Badge from "./ui/Badge";
import Metric from "./ui/Metric";

import {
  ageGroupsLabel,
  categoryLabels,
  difficultyLabels,
  exerciseCodeLabel,
  fieldSizeLabels,
  goalLabels,
  intensityLabels,
  playersLabel,
  statusLabels,
  tierLabels,
} from "./types";

import type { ExerciseRow } from "./types";

type ExerciseCardProps = {
  exercise: ExerciseRow;
  isProcessing: boolean;
  onArchive: (exercise: ExerciseRow) => void;
  onDelete: (exercise: ExerciseRow) => void;
};

type BadgeTone = "neutral" | "sky" | "emerald" | "amber" | "rose" | "violet";

function statusTone(status: string): BadgeTone {
  if (status === "active") return "emerald";
  if (status === "draft") return "amber";

  return "neutral";
}

function difficultyTone(difficulty: string): BadgeTone {
  if (difficulty === "easy") return "sky";
  if (difficulty === "medium") return "amber";
  if (difficulty === "hard") return "rose";
  if (difficulty === "advanced") return "violet";

  return "neutral";
}

function tierTone(tier: string): BadgeTone {
  if (tier === "core") return "emerald";
  if (tier === "signature") return "amber";
  if (tier === "community") return "violet";
  if (tier === "custom") return "sky";

  return "neutral";
}

function intensityTone(intensity: string | null): BadgeTone {
  if (intensity === "low") return "sky";
  if (intensity === "medium") return "amber";
  if (intensity === "high") return "rose";
  if (intensity === "variable") return "violet";

  return "neutral";
}

function getCoverImageUrl(path: string | null) {
  if (!path) return null;

  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("/") ||
    path.startsWith("data:") ||
    path.startsWith("blob:")
  ) {
    return path;
  }

  return supabase.storage.from("exercise-media").getPublicUrl(path).data
    .publicUrl;
}

export default function ExerciseCard({
  exercise,
  isProcessing,
  onArchive,
  onDelete,
}: ExerciseCardProps) {
  const ageGroups = ageGroupsLabel(exercise.age_groups ?? []);
  const visibleAgeGroups = ageGroups.slice(0, 4);
  const hiddenAgeGroupsCount = Math.max(ageGroups.length - 4, 0);

  const goals = exercise.exercise_goals ?? [];
  const tags = exercise.exercise_tags ?? [];

  const categoryLabel =
    categoryLabels[exercise.category] ?? exercise.category ?? "Без категорії";

  const primaryGoalValue =
    exercise.primary_goal?.trim() || goals[0]?.goal?.trim() || null;
  const primaryGoal = primaryGoalValue
    ? (goalLabels[primaryGoalValue] ?? primaryGoalValue)
    : null;

  const coverImageUrl = getCoverImageUrl(exercise.cover_image_path);

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl">
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-950">
        {coverImageUrl ? (
          <Image
            src={coverImageUrl}
            alt={`Обкладинка вправи «${exercise.title}»`}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950">
            <div className="absolute -right-10 -top-12 size-40 rounded-full border border-sky-400/20" />
            <div className="absolute -bottom-16 -left-10 size-44 rounded-full bg-sky-400/10 blur-2xl" />
            <span
              className="absolute left-5 top-5 text-4xl"
              aria-hidden="true"
            >
              ⚽
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-slate-950/10" />

        <div className="absolute bottom-0 left-0 right-0 p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-300">
            {categoryLabel}
          </p>
          <p className="mt-1 line-clamp-1 text-lg font-black text-white">
            {exercise.title}
          </p>
        </div>

        <div className="absolute left-4 top-4">
          <Badge
            tone={tierTone(exercise.library_tier)}
            className="shadow-sm ring-1 ring-white/20"
          >
            {tierLabels[exercise.library_tier] ?? exercise.library_tier}
          </Badge>
        </div>

        <div className="absolute right-4 top-4 rounded-full bg-slate-950/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-white shadow-sm backdrop-blur">
          {exerciseCodeLabel(exercise.code)}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={statusTone(exercise.status)}>
            {statusLabels[exercise.status] ?? exercise.status}
          </Badge>

          <Badge tone={difficultyTone(exercise.difficulty)}>
            {difficultyLabels[exercise.difficulty] ?? exercise.difficulty}
          </Badge>

          {exercise.is_system ? <Badge tone="violet">Системна</Badge> : null}
        </div>

        <h2 className="mt-4 line-clamp-2 text-2xl font-black leading-tight text-slate-950">
          {exercise.title}
        </h2>

        <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-sky-600">
          {categoryLabel}
        </p>

        {primaryGoal ? (
          <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-500">
              Основна мета
            </p>
            <p className="mt-1 line-clamp-2 text-sm font-black text-sky-950">
              {primaryGoal}
            </p>
          </div>
        ) : exercise.description ? (
          <p className="mt-4 line-clamp-3 text-sm font-semibold leading-6 text-slate-500">
            {exercise.description}
          </p>
        ) : (
          <p className="mt-4 text-sm font-semibold text-slate-400">
            Мету та опис вправи ще не додано.
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Metric
            label="Час"
            value={`${exercise.duration_minutes} хв`}
            icon={<span>⏱</span>}
          />

          <Metric
            label="Гравці"
            value={playersLabel(exercise.min_players, exercise.max_players)}
            icon={<span>👥</span>}
          />

          <Metric
            label="Інтенсивність"
            value={
              exercise.intensity
                ? (intensityLabels[exercise.intensity] ?? exercise.intensity)
                : "Не вказано"
            }
            icon={<span>↗</span>}
            className={
              exercise.intensity
                ? `ring-1 ring-inset ${
                    intensityTone(exercise.intensity) === "rose"
                      ? "ring-rose-100"
                      : intensityTone(exercise.intensity) === "amber"
                        ? "ring-amber-100"
                        : intensityTone(exercise.intensity) === "violet"
                          ? "ring-violet-100"
                          : "ring-sky-100"
                  }`
                : ""
            }
          />

          <Metric
            label="Майданчик"
            value={
              exercise.field_size
                ? (fieldSizeLabels[exercise.field_size] ?? exercise.field_size)
                : "Не вказано"
            }
            icon={<span>▱</span>}
          />
        </div>

        {visibleAgeGroups.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {visibleAgeGroups.map((ageGroup) => (
              <Badge key={ageGroup} tone="neutral">
                {ageGroup}
              </Badge>
            ))}

            {hiddenAgeGroupsCount > 0 ? (
              <Badge tone="neutral">+{hiddenAgeGroupsCount}</Badge>
            ) : null}
          </div>
        ) : null}

        {tags.length > 0 ? (
          <p className="mt-4 line-clamp-1 text-sm font-semibold text-slate-400">
            {tags
              .slice(0, 4)
              .map((item) => `#${item.tag}`)
              .join(" ")}
            {tags.length > 4 ? ` +${tags.length - 4}` : ""}
          </p>
        ) : null}

        <div className="mt-auto grid grid-cols-2 gap-2 border-t border-slate-100 pt-5">
          <Link
            href={`/admin/coach/exercises/${exercise.id}`}
            className="col-span-2 inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 font-black text-white transition hover:bg-sky-600"
          >
            Відкрити вправу
          </Link>

          <button
            type="button"
            disabled={isProcessing}
            onClick={() => onArchive(exercise)}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-amber-200 px-3 text-sm font-black text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exercise.status === "archived" ? "Повернути" : "В архів"}
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={() => onDelete(exercise)}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-rose-200 px-3 text-sm font-black text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Видалити
          </button>
        </div>
      </div>
    </article>
  );
}
