export type ExerciseImportFormat = "json" | "csv";

export type ExerciseImportPreviewFilter =
  | "all"
  | "ready"
  | "errors"
  | "duplicates";


export type ExerciseImportStatus = "draft" | "active";

export type ExerciseImportDifficulty =
  | "easy"
  | "medium"
  | "hard"
  | "advanced";

export type ExerciseImportLibraryTier =
  | "custom"
  | "core"
  | "signature"
  | "community";

export type ExerciseImportIntensity =
  | "low"
  | "medium"
  | "high"
  | "variable";

export type ExerciseImportFieldSize =
  | "small"
  | "medium"
  | "large"
  | "full_court"
  | "custom";

export type ExerciseImportRecord = {
  code: string;
  title: string;
  category: string;
  exerciseType: string;
  playerFormat: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  durationMinutes: number;
  difficulty: ExerciseImportDifficulty;
  intensity: ExerciseImportIntensity | null;
  fieldSize: ExerciseImportFieldSize | null;
  description: string | null;
  organization: string | null;
  equipment: string | null;
  coachingPoints: string | null;
  commonMistakes: string | null;
  progression: string | null;
  regression: string | null;
  alternative: string | null;
  loadControl: string | null;
  ageGroups: string[];
  goals: string[];
  tags: string[];
  externalVideoUrl: string | null;
  status: ExerciseImportStatus;
  libraryTier: ExerciseImportLibraryTier;
  source: string | null;
};

export type ExerciseImportIssue = {
  field: string;
  message: string;
};

export type ExerciseImportDuplicate = {
  id: string;
  title: string;
};

export type ExerciseImportPreviewRow = {
  rowNumber: number;
  record: ExerciseImportRecord | null;
  issues: ExerciseImportIssue[];
  duplicate: ExerciseImportDuplicate | null;
};

export type ExerciseDuplicateStrategy = "skip" | "update";

export type ExerciseImportRowStatus =
  | "created"
  | "updated"
  | "skipped"
  | "error";

export type ExerciseImportRowResult = {
  rowNumber: number;
  code: string;
  title: string;
  status: ExerciseImportRowStatus;
  message: string;
};

export type ExerciseImportSummary = {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  results: ExerciseImportRowResult[];
};

export type ExerciseImportProgress = {
  current: number;
  total: number;
};
