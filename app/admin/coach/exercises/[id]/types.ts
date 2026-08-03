export type ExerciseStatus = "draft" | "active" | "archived";
export type ExerciseDifficulty = "easy" | "medium" | "hard" | "advanced";

export type ExerciseGoal = {
  id: string;
  goal: string;
};

export type ExerciseTag = {
  id: string;
  tag: string;
};

export type Exercise = {
  id: string;
  code: string | null;
  title: string;
  description: string | null;
  organization: string | null;
  coaching_points: string | null;
  common_mistakes: string | null;
  progression: string | null;
  regression: string | null;
  load_control: string | null;
  equipment: string | null;
  primary_goal: string | null;
  category: string;
  exercise_type: string;
  player_format: string | null;
  min_players: number | null;
  max_players: number | null;
  duration_minutes: number;
  difficulty: ExerciseDifficulty;
  intensity: string | null;
  field_size: string | null;
  library_tier: string | null;
  source: string | null;
  is_system: boolean;
  age_groups: string[];
  cover_image_path: string | null;
  diagram_image_path: string | null;
  video_path: string | null;
  external_video_url: string | null;
  status: ExerciseStatus;
  created_at: string;
  updated_at: string;
  exercise_goals: ExerciseGoal[];
  exercise_tags: ExerciseTag[];
};
