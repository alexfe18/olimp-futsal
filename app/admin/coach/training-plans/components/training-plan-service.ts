import { supabase } from "@/lib/supabase";

import type { ExerciseRow } from "@/app/admin/coach/exercises/components/types";

import type {
  ExerciseSummary,
  TrainingPlanBlockDraft,
  TrainingPlanDraft,
  TrainingPlanRow,
} from "./types";


const supportedBlockTypes = new Set([
  "warm_up",
  "technical",
  "passing",
  "possession",
  "transition",
  "pressing",
  "defending",
  "attacking",
  "finishing",
  "set_pieces",
  "complex",
  "game",
  "fitness",
  "goalkeeper",
  "recovery",
  "cool_down",
  "custom",
]);

function normalizeBlockType(category: string) {
  if (supportedBlockTypes.has(category)) return category;
  if (category === "physical") return "fitness";
  if (category === "tactical") return "complex";
  return "custom";
}

const exerciseSelect = `
  id,
  code,
  title,
  description,
  category,
  duration_minutes,
  difficulty,
  status,
  player_format,
  min_players,
  max_players,
  age_groups
`;

function normalizeExerciseRelation(
  relation: ExerciseSummary | ExerciseSummary[] | null,
) {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

export function createManualBlock(sortOrder: number): TrainingPlanBlockDraft {
  return {
    clientId: crypto.randomUUID(),
    persistedId: null,
    exerciseId: null,
    code: null,
    title: "",
    description: "",
    category: "custom",
    durationMinutes: 10,
    notes: "",
    sortOrder,
    exercise: null,
  };
}

export function createBlockFromExercise(
  exercise: ExerciseSummary,
  sortOrder: number,
): TrainingPlanBlockDraft {
  return {
    clientId: crypto.randomUUID(),
    persistedId: null,
    exerciseId: exercise.id,
    code: exercise.code,
    title: exercise.title,
    description: exercise.description,
    category: exercise.category,
    durationMinutes: Math.max(1, Number(exercise.duration_minutes) || 10),
    notes: "",
    sortOrder,
    exercise,
  };
}

export async function loadExerciseQuickView(exerciseId: string) {
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
    .eq("id", exerciseId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Вправу не знайдено.");
  }

  return data as ExerciseRow;
}

export async function loadExerciseLibrary() {
  const { data, error } = await supabase
    .from("exercises")
    .select(exerciseSelect)
    .eq("status", "active")
    .order("category", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ExerciseSummary[];
}

export async function loadTrainingPlan(planId: string) {
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
          exercise_id,
          title,
          description,
          duration_minutes,
          block_type,
          sort_order,
          notes,
          exercises (
            ${exerciseSelect}
          )
        )
      `,
    )
    .eq("id", planId)
    .order("sort_order", {
      referencedTable: "training_plan_blocks",
      ascending: true,
    })
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "План тренування не знайдено.");
  }

  const row = data as unknown as TrainingPlanRow;
  const blocks = [...(row.training_plan_blocks ?? [])]
    .sort((first, second) => first.sort_order - second.sort_order)
    .map<TrainingPlanBlockDraft>((block, index) => {
      const exercise = normalizeExerciseRelation(block.exercises);

      return {
        clientId: block.id,
        persistedId: block.id,
        exerciseId: block.exercise_id ?? exercise?.id ?? null,
        code: exercise?.code ?? null,
        title: exercise?.title ?? block.title,
        description: block.description,
        category: exercise?.category ?? block.block_type ?? "other",
        durationMinutes: Number(block.duration_minutes) || 10,
        notes: block.notes ?? "",
        sortOrder: index,
        exercise,
      };
    });

  const draft: TrainingPlanDraft = {
    id: row.id,
    title: row.title,
    sessionDate: row.session_date ?? "",
    teamName: row.team_name ?? "Олімп Футзал",
    ageGroup: row.age_group ?? "",
    objective: row.objective ?? "",
    notes: row.notes ?? "",
    intensity: row.intensity,
    status: row.status,
    blocks,
  };

  return {
    draft,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function saveTrainingPlanDraft(draft: TrainingPlanDraft) {
  const blocks = draft.blocks.map((block, index) => ({
    exercise_id: block.exerciseId ?? block.exercise?.id ?? null,
    title: block.title.trim(),
    description:
      block.description?.trim() ||
      (block.exercise?.title
        ? `Вправа з бібліотеки: ${block.exercise.title}`
        : null),
    duration_minutes: Number(block.durationMinutes),
    block_type: normalizeBlockType(block.category),
    sort_order: index,
    notes: block.notes.trim() || null,
  }));

  const { data, error } = await supabase.rpc("save_training_plan_draft", {
    p_plan_id: draft.id,
    p_title: draft.title.trim(),
    p_session_date: draft.sessionDate || null,
    p_team_name: draft.teamName.trim() || null,
    p_age_group: draft.ageGroup || null,
    p_objective: draft.objective.trim() || null,
    p_notes: draft.notes.trim() || null,
    p_intensity: draft.intensity,
    p_status: draft.status,
    p_blocks: blocks,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (typeof data !== "string" || !data) {
    throw new Error("Функція збереження не повернула ID плану тренування.");
  }

  return data;
}
