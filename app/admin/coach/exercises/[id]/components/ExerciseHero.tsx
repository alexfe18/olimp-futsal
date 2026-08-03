import Badge from "../../components/ui/Badge";
import HeroCard from "../../components/ui/HeroCard";
import PropertyGrid from "../../components/ui/PropertyGrid";
import type { Exercise } from "../types";
import {
  categoryLabels,
  difficultyLabels,
  getPlayersLabel,
  goalLabels,
  libraryTierLabels,
  playerFormatLabels,
  statusLabels,
  typeLabels,
} from "../utils";

type ExerciseHeroProps = {
  exercise: Exercise;
  coverUrl: string | null;
};

const intensityLabels: Record<string, string> = {
  low: "Низька",
  medium: "Середня",
  high: "Висока",
  variable: "Змінна",
};

const fieldSizeLabels: Record<string, string> = {
  small: "Мала зона",
  medium: "Середня зона",
  large: "Велика зона",
  full_court: "Весь майданчик",
  half_court: "Пів майданчика",
  third_court: "Третина майданчика",
  small_area: "Мала зона",
  custom: "Індивідуально",
};


function getStatusTone(status: Exercise["status"]) {
  if (status === "active") return "emerald" as const;
  if (status === "draft") return "amber" as const;

  return "neutral" as const;
}

function getDifficultyTone(difficulty: Exercise["difficulty"]) {
  if (difficulty === "easy") return "sky" as const;
  if (difficulty === "medium") return "amber" as const;
  if (difficulty === "hard") return "rose" as const;

  return "violet" as const;
}

function getTierTone(tier: string | null) {
  if (tier === "core") return "emerald" as const;
  if (tier === "signature") return "amber" as const;
  if (tier === "community") return "violet" as const;

  return "sky" as const;
}

export default function ExerciseHero({
  exercise,
  coverUrl,
}: ExerciseHeroProps) {
  const category = categoryLabels[exercise.category] ?? exercise.category;

  const exerciseType =
    typeLabels[exercise.exercise_type] ?? exercise.exercise_type;

  const primaryGoalValue =
    exercise.primary_goal?.trim() ||
    exercise.exercise_goals[0]?.goal?.trim() ||
    null;

  const primaryGoal = primaryGoalValue
    ? (goalLabels[primaryGoalValue] ?? primaryGoalValue)
    : null;

  const propertyItems = [
    {
      label: "Час",
      value: `${exercise.duration_minutes} хв`,
      icon: <span>⏱</span>,
    },
    {
      label: "Гравці",
      value: getPlayersLabel(exercise.min_players, exercise.max_players),
      icon: <span>👥</span>,
    },
    {
      label: "Інтенсивність",
      value: exercise.intensity
        ? (intensityLabels[exercise.intensity] ?? exercise.intensity)
        : "Не вказано",
      icon: <span>↗</span>,
    },
    {
      label: "Майданчик",
      value: exercise.field_size
        ? (fieldSizeLabels[exercise.field_size] ?? exercise.field_size)
        : "Не вказано",
      icon: <span>▱</span>,
    },
    {
      label: "Формат",
      value: exercise.player_format
        ? (playerFormatLabels[exercise.player_format] ?? exercise.player_format)
        : "Не вказано",
      icon: <span>◆</span>,
    },
    {
      label: "Тип",
      value: exerciseType,
      icon: <span>⚽</span>,
    },
  ];

  return (
    <HeroCard
      className="mt-5"
      title={exercise.title}
      eyebrow={category}
      description={
        exercise.description || "До цієї вправи поки не додано короткий опис."
      }
      imageUrl={coverUrl}
      imageAlt={exercise.title}
      code={
        <span className="inline-flex min-h-8 items-center rounded-full bg-white/10 px-4 text-xs font-black uppercase tracking-[0.16em] text-white ring-1 ring-white/15 backdrop-blur">
          {exercise.code || "Без коду"}
        </span>
      }
      badges={
        <>
          <Badge tone={getStatusTone(exercise.status)}>
            {statusLabels[exercise.status]}
          </Badge>

          <Badge tone={getDifficultyTone(exercise.difficulty)}>
            {difficultyLabels[exercise.difficulty]}
          </Badge>

          <Badge tone={getTierTone(exercise.library_tier)}>
            {exercise.library_tier
              ? (libraryTierLabels[exercise.library_tier] ??
                exercise.library_tier)
              : exercise.is_system
                ? "Системна"
                : "Власна"}
          </Badge>
        </>
      }
      meta={<PropertyGrid items={propertyItems} className="max-w-5xl" />}
      footer={
        <div className="flex flex-wrap items-center gap-3">
          {primaryGoal ? (
            <div className="inline-flex min-h-11 items-center gap-3 rounded-2xl bg-sky-400/10 px-4 py-2 ring-1 ring-sky-300/20 backdrop-blur">
              <span aria-hidden="true">🎯</span>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-300">
                  Основна мета
                </p>

                <p className="text-sm font-black text-white">{primaryGoal}</p>
              </div>
            </div>
          ) : null}

          {exercise.age_groups.map((ageGroup) => (
            <span
              key={ageGroup}
              className="inline-flex min-h-8 items-center rounded-full bg-white/10 px-3 text-xs font-black text-slate-200 ring-1 ring-white/10"
            >
              {ageGroup}
            </span>
          ))}
        </div>
      }
    />
  );
}
