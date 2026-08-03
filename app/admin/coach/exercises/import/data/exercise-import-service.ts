import { supabase } from "@/lib/supabase";

import type {
  ExerciseDuplicateStrategy,
  ExerciseImportPreviewRow,
  ExerciseImportProgress,
  ExerciseImportRecord,
  ExerciseImportRowResult,
  ExerciseImportSummary,
} from "../types";

type ExistingExerciseLookup = {
  id: string;
  code: string;
  title: string;
};

type ExerciseRelationSnapshot = {
  goal?: string;
  tag?: string;
};

type ExerciseSnapshot = {
  id: string;
  code: string | null;
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
  difficulty: string;
  intensity: string | null;
  age_groups: string[];
  field_size: string | null;
  external_video_url: string | null;
  primary_goal: string | null;
  progression: string | null;
  regression: string | null;
  alternative: string | null;
  load_control: string | null;
  status: string;
  library_tier: string;
  source: string | null;
  exercise_goals: ExerciseRelationSnapshot[];
  exercise_tags: ExerciseRelationSnapshot[];
};

const SNAPSHOT_SELECT = `
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
  player_format,
  min_players,
  max_players,
  duration_minutes,
  difficulty,
  intensity,
  age_groups,
  field_size,
  external_video_url,
  primary_goal,
  progression,
  regression,
  alternative,
  load_control,
  status,
  library_tier,
  source,
  exercise_goals(goal),
  exercise_tags(tag)
`;

function uniqueValues(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function createExercisePayload(record: ExerciseImportRecord) {
  return {
    code: record.code,
    title: record.title,
    description: record.description,
    organization: record.organization,
    coaching_points: record.coachingPoints,
    common_mistakes: record.commonMistakes,
    equipment: record.equipment,
    category: record.category,
    exercise_type: record.exerciseType,
    player_format: record.playerFormat,
    min_players: record.minPlayers,
    max_players: record.maxPlayers,
    duration_minutes: record.durationMinutes,
    difficulty: record.difficulty,
    intensity: record.intensity,
    age_groups: uniqueValues(record.ageGroups),
    field_size: record.fieldSize,
    external_video_url: record.externalVideoUrl,
    primary_goal: uniqueValues(record.goals)[0] ?? null,
    progression: record.progression,
    regression: record.regression,
    alternative: record.alternative,
    load_control: record.loadControl,
    status: record.status,
    library_tier: record.libraryTier,
    source: record.source,
  };
}

async function replaceGoals(exerciseId: string, goals: string[]) {
  const { error: deleteError } = await supabase
    .from("exercise_goals")
    .delete()
    .eq("exercise_id", exerciseId);

  if (deleteError) throw new Error(deleteError.message);

  const normalizedGoals = uniqueValues(goals);
  if (normalizedGoals.length === 0) return;

  const { error: insertError } = await supabase.from("exercise_goals").insert(
    normalizedGoals.map((goal) => ({ exercise_id: exerciseId, goal })),
  );

  if (insertError) throw new Error(insertError.message);
}

async function replaceTags(exerciseId: string, tags: string[]) {
  const { error: deleteError } = await supabase
    .from("exercise_tags")
    .delete()
    .eq("exercise_id", exerciseId);

  if (deleteError) throw new Error(deleteError.message);

  const normalizedTags = uniqueValues(tags);
  if (normalizedTags.length === 0) return;

  const { error: insertError } = await supabase.from("exercise_tags").insert(
    normalizedTags.map((tag) => ({ exercise_id: exerciseId, tag })),
  );

  if (insertError) throw new Error(insertError.message);
}

async function loadExerciseSnapshot(exerciseId: string) {
  const { data, error } = await supabase
    .from("exercises")
    .select(SNAPSHOT_SELECT)
    .eq("id", exerciseId)
    .single();

  if (error) throw new Error(error.message);

  return data as unknown as ExerciseSnapshot;
}

async function restoreExerciseSnapshot(snapshot: ExerciseSnapshot) {
  const {
    id,
    exercise_goals: goalRows,
    exercise_tags: tagRows,
    ...payload
  } = snapshot;

  const { error } = await supabase
    .from("exercises")
    .update(payload)
    .eq("id", id);

  if (error) {
    console.error("Exercise import rollback error:", error);
    return;
  }

  try {
    await replaceGoals(
      id,
      goalRows.flatMap((row) =>
        typeof row.goal === "string" ? [row.goal] : [],
      ),
    );
    await replaceTags(
      id,
      tagRows.flatMap((row) =>
        typeof row.tag === "string" ? [row.tag] : [],
      ),
    );
  } catch (rollbackError) {
    console.error("Exercise relation rollback error:", rollbackError);
  }
}

export async function attachExerciseImportDuplicates(
  rows: ExerciseImportPreviewRow[],
): Promise<ExerciseImportPreviewRow[]> {
  const validCodes = uniqueValues(
    rows.flatMap((row) =>
      row.record && row.issues.length === 0 ? [row.record.code] : [],
    ),
  );

  if (validCodes.length === 0) return rows;

  const { data, error } = await supabase
    .from("exercises")
    .select("id, code, title")
    .in("code", validCodes);

  if (error) {
    throw new Error(`Не вдалося перевірити дублікати: ${error.message}`);
  }

  const existingByCode = new Map(
    ((data ?? []) as ExistingExerciseLookup[]).map((exercise) => [
      exercise.code,
      exercise,
    ]),
  );

  return rows.map((row) => {
    const duplicate = row.record
      ? existingByCode.get(row.record.code) ?? null
      : null;

    return { ...row, duplicate };
  });
}

async function importNewExercise(
  record: ExerciseImportRecord,
  userId: string,
) {
  let createdExerciseId: string | null = null;

  try {
    const { data, error } = await supabase
      .from("exercises")
      .insert({
        ...createExercisePayload(record),
        created_by: userId,
        is_system: false,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    createdExerciseId = data.id as string;
    await replaceGoals(createdExerciseId, record.goals);
    await replaceTags(createdExerciseId, record.tags);

    return createdExerciseId;
  } catch (error) {
    if (createdExerciseId) {
      await supabase.from("exercises").delete().eq("id", createdExerciseId);
    }

    throw error;
  }
}

async function updateExistingExercise(
  exerciseId: string,
  record: ExerciseImportRecord,
) {
  const snapshot = await loadExerciseSnapshot(exerciseId);
  let exerciseWasUpdated = false;

  try {
    const { error } = await supabase
      .from("exercises")
      .update(createExercisePayload(record))
      .eq("id", exerciseId);

    if (error) throw new Error(error.message);
    exerciseWasUpdated = true;

    await replaceGoals(exerciseId, record.goals);
    await replaceTags(exerciseId, record.tags);
  } catch (error) {
    if (exerciseWasUpdated) {
      await restoreExerciseSnapshot(snapshot);
    }

    throw error;
  }
}

export async function importExercises(
  rows: ExerciseImportPreviewRow[],
  duplicateStrategy: ExerciseDuplicateStrategy,
  onProgress?: (progress: ExerciseImportProgress) => void,
): Promise<ExerciseImportSummary> {
  const eligibleRows = rows.filter(
    (row) => row.record !== null && row.issues.length === 0,
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Сесію адміністратора не знайдено.");
  }

  const results: ExerciseImportRowResult[] = [];

  for (let index = 0; index < eligibleRows.length; index += 1) {
    const row = eligibleRows[index];
    const record = row.record;

    if (!record) continue;

    try {
      if (row.duplicate && duplicateStrategy === "skip") {
        results.push({
          rowNumber: row.rowNumber,
          code: record.code,
          title: record.title,
          status: "skipped",
          message: "Вправу з таким кодом пропущено.",
        });
      } else if (row.duplicate) {
        await updateExistingExercise(row.duplicate.id, record);
        results.push({
          rowNumber: row.rowNumber,
          code: record.code,
          title: record.title,
          status: "updated",
          message: "Існуючу вправу оновлено.",
        });
      } else {
        await importNewExercise(record, user.id);
        results.push({
          rowNumber: row.rowNumber,
          code: record.code,
          title: record.title,
          status: "created",
          message: "Нову вправу створено.",
        });
      }
    } catch (error) {
      console.error("Exercise import row error:", error);
      results.push({
        rowNumber: row.rowNumber,
        code: record.code,
        title: record.title,
        status: "error",
        message:
          error instanceof Error ? error.message : "Не вдалося імпортувати вправу.",
      });
    }

    onProgress?.({ current: index + 1, total: eligibleRows.length });
  }

  return {
    created: results.filter((result) => result.status === "created").length,
    updated: results.filter((result) => result.status === "updated").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    failed: results.filter((result) => result.status === "error").length,
    results,
  };
}
