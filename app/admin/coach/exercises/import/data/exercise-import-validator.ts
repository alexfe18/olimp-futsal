import {
  ageOptions,
  categoryOptions,
  difficultyOptions,
  formatOptions,
  goalOptions,
  typeOptions,
} from "../../components/form/config/exercise-options";

import type {
  ExerciseImportDifficulty,
  ExerciseImportFieldSize,
  ExerciseImportIntensity,
  ExerciseImportIssue,
  ExerciseImportLibraryTier,
  ExerciseImportPreviewRow,
  ExerciseImportRecord,
  ExerciseImportStatus,
} from "../types";

const categoryValues = new Set(categoryOptions.map(([value]) => value));
const typeValues = new Set(typeOptions.map(([value]) => value));
const playerFormatValues = new Set<string>(
  formatOptions.map(([value]) => value).filter(Boolean),
);
const difficultyValues = new Set(
  difficultyOptions.map(([value]) => value),
);
const goalValues = new Set(goalOptions.map(([value]) => value));
const ageGroupValues = new Set(ageOptions);

const intensityValues = new Set<ExerciseImportIntensity>([
  "low",
  "medium",
  "high",
  "variable",
]);

const fieldSizeValues = new Set<ExerciseImportFieldSize>([
  "small",
  "medium",
  "large",
  "full_court",
  "custom",
]);

const statusValues = new Set<ExerciseImportStatus>(["draft", "active"]);

const libraryTierValues = new Set<ExerciseImportLibraryTier>([
  "custom",
  "core",
  "signature",
  "community",
]);

const aliases: Record<string, string[]> = {
  code: ["code", "exercise_code"],
  title: ["title", "name", "exercise_title"],
  category: ["category"],
  exercise_type: ["exercise_type", "type"],
  player_format: ["player_format", "format"],
  min_players: ["min_players"],
  max_players: ["max_players"],
  duration_minutes: ["duration_minutes", "duration"],
  difficulty: ["difficulty"],
  intensity: ["intensity"],
  field_size: ["field_size"],
  description: ["description"],
  organization: ["organization"],
  equipment: ["equipment"],
  coaching_points: ["coaching_points"],
  common_mistakes: ["common_mistakes"],
  progression: ["progression"],
  regression: ["regression"],
  alternative: ["alternative"],
  load_control: ["load_control"],
  age_groups: ["age_groups"],
  goals: ["goals", "exercise_goals"],
  tags: ["tags", "exercise_tags"],
  external_video_url: ["external_video_url", "video_url"],
  status: ["status"],
  library_tier: ["library_tier", "tier"],
  source: ["source"],
};

function getRawValue(row: Record<string, unknown>, field: string) {
  const candidateKeys = aliases[field] ?? [field];

  for (const key of candidateKeys) {
    if (key in row) return row[key];
  }

  return undefined;
}

function asTrimmedString(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  return "";
}

function asOptionalString(value: unknown) {
  const normalized = asTrimmedString(value);
  return normalized || null;
}

const importTitleMetadataSuffix = /\s+[—–-]\s+ОНОВЛЕНО\s*$/iu;

function normalizeImportedTitle(value: unknown) {
  return asTrimmedString(value).replace(importTitleMetadataSuffix, "").trim();
}

function asInteger(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value)) return value;

  const normalized = asTrimmedString(value);
  if (!normalized) return null;

  const parsed = Number.parseInt(normalized, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function splitList(value: unknown) {
  const rawValues = Array.isArray(value)
    ? value
    : asTrimmedString(value)
      ? asTrimmedString(value).split(/[|,]/)
      : [];

  const normalizedValues = rawValues.flatMap((item) => {
    const normalized = asTrimmedString(item).replace(/^#/, "");
    return normalized ? [normalized] : [];
  });

  return [...new Set(normalizedValues)];
}

function normalizeAgeGroup(value: string) {
  return value
    .replace(/\s+/g, "")
    .replace(/-/g, "–")
    .replace(/^дорослі$/i, "Дорослі");
}

function addIssue(
  issues: ExerciseImportIssue[],
  field: string,
  message: string,
) {
  issues.push({ field, message });
}

function validateExternalUrl(
  value: string | null,
  issues: ExerciseImportIssue[],
) {
  if (!value) return;

  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) {
      addIssue(
        issues,
        "external_video_url",
        "Посилання має використовувати http або https.",
      );
    }
  } catch {
    addIssue(
      issues,
      "external_video_url",
      "Зовнішнє відео містить некоректне посилання.",
    );
  }
}

function normalizeRecord(
  row: Record<string, unknown>,
): { record: ExerciseImportRecord; issues: ExerciseImportIssue[] } {
  const issues: ExerciseImportIssue[] = [];

  const code = asTrimmedString(getRawValue(row, "code")).toUpperCase();
  const title = normalizeImportedTitle(getRawValue(row, "title"));
  const category = asTrimmedString(getRawValue(row, "category"));
  const exerciseType = asTrimmedString(getRawValue(row, "exercise_type"));
  const playerFormat = asOptionalString(getRawValue(row, "player_format"));
  const minPlayers = asInteger(getRawValue(row, "min_players"));
  const maxPlayers = asInteger(getRawValue(row, "max_players"));
  const durationMinutes = asInteger(getRawValue(row, "duration_minutes"));
  const difficulty = asTrimmedString(
    getRawValue(row, "difficulty"),
  ) as ExerciseImportDifficulty;
  const intensity = asOptionalString(
    getRawValue(row, "intensity"),
  ) as ExerciseImportIntensity | null;
  const fieldSize = asOptionalString(
    getRawValue(row, "field_size"),
  ) as ExerciseImportFieldSize | null;
  const status = (asOptionalString(getRawValue(row, "status")) ??
    "draft") as ExerciseImportStatus;
  const libraryTier = (asOptionalString(getRawValue(row, "library_tier")) ??
    "custom") as ExerciseImportLibraryTier;

  const ageGroups = splitList(getRawValue(row, "age_groups")).map(
    normalizeAgeGroup,
  );
  const goals = splitList(getRawValue(row, "goals"));
  const tags = splitList(getRawValue(row, "tags"));
  const externalVideoUrl = asOptionalString(
    getRawValue(row, "external_video_url"),
  );

  if (!code) {
    addIssue(issues, "code", "Код вправи є обов'язковим.");
  } else if (!/^[A-Z0-9][A-Z0-9_-]{2,49}$/.test(code)) {
    addIssue(
      issues,
      "code",
      "Код повинен містити 3–50 символів: A–Z, 0–9, _ або -.",
    );
  }

  if (title.length < 2) {
    addIssue(issues, "title", "Назва вправи повинна містити щонайменше 2 символи.");
  }

  if (!categoryValues.has(category as (typeof categoryOptions)[number][0])) {
    addIssue(issues, "category", `Невідома категорія: ${category || "—"}.`);
  }

  if (!typeValues.has(exerciseType as (typeof typeOptions)[number][0])) {
    addIssue(issues, "exercise_type", `Невідомий тип: ${exerciseType || "—"}.`);
  }

  if (playerFormat && !playerFormatValues.has(playerFormat)) {
    addIssue(issues, "player_format", `Невідомий формат: ${playerFormat}.`);
  }

  if (
    durationMinutes === null ||
    durationMinutes < 1 ||
    durationMinutes > 300
  ) {
    addIssue(
      issues,
      "duration_minutes",
      "Тривалість повинна бути цілим числом від 1 до 300.",
    );
  }

  if (!difficultyValues.has(difficulty)) {
    addIssue(issues, "difficulty", `Невідома складність: ${difficulty || "—"}.`);
  }

  if (minPlayers !== null && (minPlayers < 1 || minPlayers > 100)) {
    addIssue(issues, "min_players", "Мінімум гравців має бути від 1 до 100.");
  }

  if (maxPlayers !== null && (maxPlayers < 1 || maxPlayers > 100)) {
    addIssue(issues, "max_players", "Максимум гравців має бути від 1 до 100.");
  }

  if (minPlayers !== null && maxPlayers !== null && minPlayers > maxPlayers) {
    addIssue(
      issues,
      "max_players",
      "Максимальна кількість гравців не може бути меншою за мінімальну.",
    );
  }

  if (intensity && !intensityValues.has(intensity)) {
    addIssue(issues, "intensity", `Невідома інтенсивність: ${intensity}.`);
  }

  if (fieldSize && !fieldSizeValues.has(fieldSize)) {
    addIssue(issues, "field_size", `Невідомий розмір майданчика: ${fieldSize}.`);
  }

  if (!statusValues.has(status)) {
    addIssue(issues, "status", `Невідомий статус: ${status}.`);
  }

  if (!libraryTierValues.has(libraryTier)) {
    addIssue(issues, "library_tier", `Невідомий рівень бібліотеки: ${libraryTier}.`);
  }

  for (const ageGroup of ageGroups) {
    if (!ageGroupValues.has(ageGroup as (typeof ageOptions)[number])) {
      addIssue(issues, "age_groups", `Невідома вікова група: ${ageGroup}.`);
    }
  }

  for (const goal of goals) {
    if (!goalValues.has(goal as (typeof goalOptions)[number][0])) {
      addIssue(issues, "goals", `Невідома ціль: ${goal}.`);
    }
  }

  validateExternalUrl(externalVideoUrl, issues);

  return {
    record: {
      code,
      title,
      category,
      exerciseType,
      playerFormat,
      minPlayers,
      maxPlayers,
      durationMinutes: durationMinutes ?? 0,
      difficulty,
      intensity,
      fieldSize,
      description: asOptionalString(getRawValue(row, "description")),
      organization: asOptionalString(getRawValue(row, "organization")),
      equipment: asOptionalString(getRawValue(row, "equipment")),
      coachingPoints: asOptionalString(getRawValue(row, "coaching_points")),
      commonMistakes: asOptionalString(getRawValue(row, "common_mistakes")),
      progression: asOptionalString(getRawValue(row, "progression")),
      regression: asOptionalString(getRawValue(row, "regression")),
      alternative: asOptionalString(getRawValue(row, "alternative")),
      loadControl: asOptionalString(getRawValue(row, "load_control")),
      ageGroups,
      goals,
      tags,
      externalVideoUrl,
      status,
      libraryTier,
      source: asOptionalString(getRawValue(row, "source")) ?? "Імпорт",
    },
    issues,
  };
}

export function validateExerciseImportRows(
  rows: Array<Record<string, unknown>>,
): ExerciseImportPreviewRow[] {
  const previewRows = rows.map((row, index) => {
    const { record, issues } = normalizeRecord(row);

    return {
      rowNumber: index + 1,
      record,
      issues,
      duplicate: null,
    } satisfies ExerciseImportPreviewRow;
  });

  const rowsByCode = new Map<string, ExerciseImportPreviewRow[]>();

  for (const row of previewRows) {
    if (!row.record?.code) continue;
    const entries = rowsByCode.get(row.record.code) ?? [];
    entries.push(row);
    rowsByCode.set(row.record.code, entries);
  }

  for (const [code, entries] of rowsByCode) {
    if (entries.length < 2) continue;

    for (const row of entries) {
      row.issues.push({
        field: "code",
        message: `Код ${code} повторюється у файлі імпорту.`,
      });
    }
  }

  return previewRows;
}
