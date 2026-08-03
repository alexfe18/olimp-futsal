export type ExerciseStatus = "draft" | "active";

export type ExercisePersistedStatus = ExerciseStatus | "archived";

export type ExerciseDifficulty = "easy" | "medium" | "hard" | "advanced";

export type ExerciseFormMode = "create" | "edit";

export type ExerciseFormValues = {
  title: string;
  category: string;
  exerciseType: string;
  playerFormat: string;
  minPlayers: string;
  maxPlayers: string;
  durationMinutes: string;
  difficulty: ExerciseDifficulty;
  description: string;
  organization: string;
  equipment: string;
  coachingPoints: string;
  commonMistakes: string;
  externalVideoUrl: string;
};

export type ExerciseFormInitialData = {
  id: string;
  status: ExercisePersistedStatus;
  values: ExerciseFormValues;
  selectedGoals: string[];
  selectedAgeGroups: string[];
  tags: string[];
  coverImagePath?: string | null;
  diagramImagePath?: string | null;
  videoPath?: string | null;
  coverImageUrl?: string | null;
  diagramImageUrl?: string | null;
};

export type ExerciseFormProps = {
  mode?: ExerciseFormMode;
  initialData?: ExerciseFormInitialData;
};

export type ExerciseFormMessage = {
  type: "success" | "error";
  text: string;
} | null;
