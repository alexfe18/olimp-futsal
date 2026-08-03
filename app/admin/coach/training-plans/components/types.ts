export type TrainingPlanStatus =
  | "draft"
  | "planned"
  | "in_progress"
  | "completed"
  | "cancelled";

export type TrainingPlanIntensity =
  | "low"
  | "medium"
  | "high"
  | "recovery";

export type TrainingTemplateStatus = "active" | "archived";

export type ExerciseSummary = {
  id: string;
  code: string | null;
  title: string;
  description: string | null;
  category: string;
  duration_minutes: number;
  difficulty: "easy" | "medium" | "hard" | "advanced";
  status: "draft" | "active" | "archived";
  player_format: string | null;
  min_players: number | null;
  max_players: number | null;
  age_groups: string[];
};

export type TrainingPlanBlockDraft = {
  clientId: string;
  persistedId: string | null;
  exerciseId: string | null;
  code: string | null;
  title: string;
  description: string | null;
  category: string;
  durationMinutes: number | "";
  notes: string;
  sortOrder: number;
  exercise: ExerciseSummary | null;
};

export type TrainingPlanDraft = {
  id: string | null;
  title: string;
  sessionDate: string;
  teamName: string;
  ageGroup: string;
  objective: string;
  notes: string;
  intensity: TrainingPlanIntensity;
  status: TrainingPlanStatus;
  blocks: TrainingPlanBlockDraft[];
};

export type TrainingPlanBlockRow = {
  id: string;
  exercise_id: string | null;
  title: string;
  description: string | null;
  duration_minutes: number;
  block_type: string;
  sort_order: number;
  notes: string | null;
  exercises: ExerciseSummary | ExerciseSummary[] | null;
};

export type TrainingPlanRow = {
  id: string;
  title: string;
  session_date: string | null;
  team_name: string | null;
  age_group: string | null;
  objective: string | null;
  planned_duration: number;
  intensity: TrainingPlanIntensity;
  status: TrainingPlanStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  training_plan_blocks: TrainingPlanBlockRow[];
};

export type TrainingPlanListRow = {
  id: string;
  title: string;
  session_date: string | null;
  team_name: string | null;
  age_group: string | null;
  objective: string | null;
  planned_duration: number;
  intensity: TrainingPlanIntensity;
  status: TrainingPlanStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  training_plan_blocks: {
    id: string;
    duration_minutes: number;
    exercise_id: string | null;
  }[];
};

export type TrainingTemplateBlockRow = {
  id: string;
  exercise_id: string | null;
  title: string;
  description: string | null;
  duration_minutes: number;
  block_type: string;
  sort_order: number;
  notes: string | null;
  exercises: ExerciseSummary | ExerciseSummary[] | null;
};

export type TrainingTemplateRow = {
  id: string;
  title: string;
  team_name: string | null;
  age_group: string | null;
  objective: string | null;
  planned_duration: number;
  intensity: TrainingPlanIntensity;
  status: TrainingTemplateStatus;
  notes: string | null;
  source_plan_id: string | null;
  created_at: string;
  updated_at: string;
  training_template_blocks: TrainingTemplateBlockRow[];
};

export type TrainingTemplateListRow = {
  id: string;
  title: string;
  team_name: string | null;
  age_group: string | null;
  objective: string | null;
  planned_duration: number;
  intensity: TrainingPlanIntensity;
  status: TrainingTemplateStatus;
  notes: string | null;
  source_plan_id: string | null;
  created_at: string;
  updated_at: string;
  training_template_blocks: {
    id: string;
    duration_minutes: number;
    exercise_id: string | null;
  }[];
};
