import { supabase } from "@/lib/supabase";

import type {
  ExerciseDifficulty,
  ExercisePersistedStatus,
} from "../types/exercise-form";

export type ExerciseGoalRecord = {
  id: string;
  goal: string;
};

export type ExerciseTagRecord = {
  id: string;
  tag: string;
};

export type EditableExerciseRecord = {
  id: string;
  title: string;
  description: string | null;
  organization: string | null;
  coaching_points: string | null;
  common_mistakes: string | null;
  equipment: string | null;
  category: string;
  exercise_type: string;
  player_format: string | null;
  min_players: number | null;
  max_players: number | null;
  duration_minutes: number;
  difficulty: ExerciseDifficulty;
  age_groups: string[];
  cover_image_path: string | null;
  diagram_image_path: string | null;
  video_path: string | null;
  external_video_url: string | null;
  status: ExercisePersistedStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  code: string | null;
  subcategory: string | null;
  library_tier: string;
  intensity: string | null;
  field_size: string | null;
  primary_goal: string | null;
  progression: string | null;
  regression: string | null;
  alternative: string | null;
  load_control: string | null;
  source: string | null;
  is_system: boolean;
  published_at: string | null;
  exercise_goals: ExerciseGoalRecord[];
  exercise_tags: ExerciseTagRecord[];
};

export type ExerciseLoaderErrorCode = "INVALID_ID" | "QUERY_FAILED";

export class ExerciseLoaderError extends Error {
  readonly code: ExerciseLoaderErrorCode;
  readonly originalError?: unknown;

  constructor(
    code: ExerciseLoaderErrorCode,
    message: string,
    originalError?: unknown,
  ) {
    super(message);
    this.name = "ExerciseLoaderError";
    this.code = code;
    this.originalError = originalError;
  }
}

const EDITABLE_EXERCISE_SELECT = `
  id,
  title,
  description,
  organization,
  coaching_points,
  common_mistakes,
  equipment,
  category,
  exercise_type,
  player_format,
  min_players,
  max_players,
  duration_minutes,
  difficulty,
  age_groups,
  cover_image_path,
  diagram_image_path,
  video_path,
  external_video_url,
  status,
  created_by,
  created_at,
  updated_at,
  code,
  subcategory,
  library_tier,
  intensity,
  field_size,
  primary_goal,
  progression,
  regression,
  alternative,
  load_control,
  source,
  is_system,
  published_at,
  exercise_goals(id, goal),
  exercise_tags(id, tag)
`;

type ExerciseQueryResult = Omit<
  EditableExerciseRecord,
  "age_groups" | "exercise_goals" | "exercise_tags"
> & {
  age_groups: unknown;
  exercise_goals: unknown;
  exercise_tags: unknown;
};

function normalizeAgeGroups(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (ageGroup): ageGroup is string => typeof ageGroup === "string",
  );
}

function normalizeGoals(value: unknown): ExerciseGoalRecord[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (
      typeof item !== "object" ||
      item === null ||
      !("id" in item) ||
      !("goal" in item) ||
      typeof item.id !== "string" ||
      typeof item.goal !== "string"
    ) {
      return [];
    }

    return [{ id: item.id, goal: item.goal }];
  });
}

function normalizeTags(value: unknown): ExerciseTagRecord[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (
      typeof item !== "object" ||
      item === null ||
      !("id" in item) ||
      !("tag" in item) ||
      typeof item.id !== "string" ||
      typeof item.tag !== "string"
    ) {
      return [];
    }

    return [{ id: item.id, tag: item.tag }];
  });
}

function normalizeExercise(
  exercise: ExerciseQueryResult,
): EditableExerciseRecord {
  return {
    ...exercise,
    age_groups: normalizeAgeGroups(exercise.age_groups),
    exercise_goals: normalizeGoals(exercise.exercise_goals),
    exercise_tags: normalizeTags(exercise.exercise_tags),
  };
}

/**
 * Loads one exercise and all data required to initialize the Edit form.
 *
 * Returns `null` when the exercise does not exist or is not available under
 * the current Supabase RLS policy. Query and configuration failures are thrown
 * as `ExerciseLoaderError` so the Edit page can show a dedicated error state.
 */
export async function loadExerciseForEdit(
  exerciseId: string,
): Promise<EditableExerciseRecord | null> {
  const normalizedExerciseId = exerciseId.trim();

  if (!normalizedExerciseId) {
    throw new ExerciseLoaderError(
      "INVALID_ID",
      "Не передано ідентифікатор вправи.",
    );
  }

  const { data, error } = await supabase
    .from("exercises")
    .select(EDITABLE_EXERCISE_SELECT)
    .eq("id", normalizedExerciseId)
    .maybeSingle();

  if (error) {
    throw new ExerciseLoaderError(
      "QUERY_FAILED",
      "Не вдалося завантажити вправу для редагування.",
      error,
    );
  }

  if (!data) return null;

  return normalizeExercise(data as unknown as ExerciseQueryResult);
}
