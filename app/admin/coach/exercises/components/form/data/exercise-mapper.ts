import type {
  ExerciseDifficulty,
  ExerciseFormInitialData,
  ExerciseFormValues,
} from "../types/exercise-form";
import type { EditableExerciseRecord } from "./exercise-loader";

export type ExerciseFormMediaUrls = {
  coverImageUrl?: string | null;
  diagramImageUrl?: string | null;
};

const supportedDifficulties = new Set<ExerciseDifficulty>([
  "easy",
  "medium",
  "hard",
  "advanced",
]);

function toTextInput(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function toNumberInput(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function normalizeDifficulty(value: string): ExerciseDifficulty {
  return supportedDifficulties.has(value as ExerciseDifficulty)
    ? (value as ExerciseDifficulty)
    : "medium";
}

function uniqueNonEmptyValues(values: Array<string | null | undefined>) {
  const uniqueValues = new Set<string>();

  for (const value of values) {
    const normalizedValue = value?.trim();
    if (normalizedValue) uniqueValues.add(normalizedValue);
  }

  return Array.from(uniqueValues);
}

export function mapExerciseToFormValues(
  exercise: EditableExerciseRecord,
): ExerciseFormValues {
  return {
    title: toTextInput(exercise.title),
    category: toTextInput(exercise.category) || "complex",
    exerciseType: toTextInput(exercise.exercise_type) || "complex",
    playerFormat: toTextInput(exercise.player_format),
    minPlayers: toNumberInput(exercise.min_players),
    maxPlayers: toNumberInput(exercise.max_players),
    durationMinutes: toNumberInput(exercise.duration_minutes) || "10",
    difficulty: normalizeDifficulty(exercise.difficulty),
    description: toTextInput(exercise.description),
    organization: toTextInput(exercise.organization),
    equipment: toTextInput(exercise.equipment),
    coachingPoints: toTextInput(exercise.coaching_points),
    commonMistakes: toTextInput(exercise.common_mistakes),
    externalVideoUrl: toTextInput(exercise.external_video_url),
  };
}

/**
 * Converts the database record returned by `loadExerciseForEdit` into the
 * client-side shape consumed by the shared Create/Edit form.
 *
 * Storage paths are deliberately not converted here. The caller resolves
 * public or signed media URLs and passes them through `mediaUrls`, keeping the
 * mapper independent from Supabase and suitable for future data sources.
 */
export function mapExerciseToFormInitialData(
  exercise: EditableExerciseRecord,
  mediaUrls: ExerciseFormMediaUrls = {},
): ExerciseFormInitialData {
  return {
    id: exercise.id,
    status: exercise.status,
    values: mapExerciseToFormValues(exercise),
    selectedGoals: uniqueNonEmptyValues([
      exercise.primary_goal,
      ...exercise.exercise_goals.map(({ goal }) => goal),
    ]),
    selectedAgeGroups: uniqueNonEmptyValues(exercise.age_groups),
    tags: uniqueNonEmptyValues(
      exercise.exercise_tags.map(({ tag }) => tag),
    ),
    coverImagePath: exercise.cover_image_path,
    diagramImagePath: exercise.diagram_image_path,
    videoPath: exercise.video_path,
    coverImageUrl: mediaUrls.coverImageUrl ?? null,
    diagramImageUrl: mediaUrls.diagramImageUrl ?? null,
  };
}
