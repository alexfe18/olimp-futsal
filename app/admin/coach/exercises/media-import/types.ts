export type ExerciseMediaKind = "cover" | "diagram";

export type ExerciseMediaPreviewFilter =
  | "all"
  | "ready"
  | "errors"
  | "replacements";

export type ExerciseMediaReplacementStrategy = "skip" | "replace";

export type ExerciseMediaPreviewStatus =
  | "ready"
  | "replacement"
  | "error";

export type ExistingExerciseMedia = {
  id: string;
  code: string;
  title: string;
  coverImagePath: string | null;
  diagramImagePath: string | null;
};

export type ExerciseMediaPreviewRow = {
  rowNumber: number;
  file: File;
  fileName: string;
  sourcePath: string;
  code: string | null;
  kind: ExerciseMediaKind | null;
  width: number | null;
  height: number | null;
  issues: string[];
  exercise: ExistingExerciseMedia | null;
  existingPath: string | null;
  status: ExerciseMediaPreviewStatus;
};

export type ExerciseMediaImportProgress = {
  current: number;
  total: number;
};

export type ExerciseMediaImportRowStatus =
  | "added"
  | "replaced"
  | "skipped"
  | "error";

export type ExerciseMediaImportRowResult = {
  rowNumber: number;
  code: string;
  title: string;
  kind: ExerciseMediaKind;
  fileName: string;
  status: ExerciseMediaImportRowStatus;
  message: string;
};

export type ExerciseMediaImportSummary = {
  added: number;
  replaced: number;
  skipped: number;
  failed: number;
  cleanupWarnings: number;
  results: ExerciseMediaImportRowResult[];
};

export type ParsedExerciseMediaSelection = {
  sourceLabel: string;
  rows: ExerciseMediaPreviewRow[];
};
