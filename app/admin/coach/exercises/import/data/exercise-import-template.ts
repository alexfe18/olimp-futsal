import type { ExerciseImportRecord } from "../types";

const sampleExercise: ExerciseImportRecord = {
  code: "WU-001",
  title: "Динамічна розминка з м'ячем",
  category: "warm_up",
  exerciseType: "technical",
  playerFormat: "full_team",
  minPlayers: 8,
  maxPlayers: 16,
  durationMinutes: 10,
  difficulty: "easy",
  intensity: "medium",
  fieldSize: "medium",
  description:
    "Динамічна розминка з м'ячем для підготовки до основної частини тренування.",
  organization:
    "Гравці працюють у парах на половині майданчика та змінюють напрямок за сигналом тренера.",
  equipment: "М'ячі, фішки, манішки",
  coachingPoints:
    "Контроль першого дотику, активна робота стопи, піднята голова.",
  commonMistakes:
    "Занадто висока швидкість на старті, відсутність комунікації між партнерами.",
  progression: "Додати передачі в один дотик і зміну позицій після пасу.",
  regression: "Зменшити темп та дозволити два-три дотики.",
  alternative: null,
  loadControl: "2 серії по 4 хвилини, пауза 60 секунд.",
  ageGroups: ["U15–U17", "Дорослі"],
  goals: ["passing", "ball_control", "decision_making"],
  tags: ["розминка", "м'яч", "передачі"],
  externalVideoUrl: null,
  status: "draft",
  libraryTier: "core",
  source: "Futsal Exercise Library v1.0",
};

const csvHeaders = [
  "code",
  "title",
  "category",
  "exercise_type",
  "player_format",
  "min_players",
  "max_players",
  "duration_minutes",
  "difficulty",
  "intensity",
  "field_size",
  "description",
  "organization",
  "equipment",
  "coaching_points",
  "common_mistakes",
  "progression",
  "regression",
  "alternative",
  "load_control",
  "age_groups",
  "goals",
  "tags",
  "external_video_url",
  "status",
  "library_tier",
  "source",
] as const;

function escapeCsvValue(value: unknown) {
  const normalized = Array.isArray(value)
    ? value.join("|")
    : value === null || value === undefined
      ? ""
      : String(value);

  return `"${normalized.replaceAll('"', '""')}"`;
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadExerciseImportJsonTemplate() {
  const content = JSON.stringify(
    {
      version: "1.0",
      language: "uk",
      exercises: [
        {
          code: sampleExercise.code,
          title: sampleExercise.title,
          category: sampleExercise.category,
          exercise_type: sampleExercise.exerciseType,
          player_format: sampleExercise.playerFormat,
          min_players: sampleExercise.minPlayers,
          max_players: sampleExercise.maxPlayers,
          duration_minutes: sampleExercise.durationMinutes,
          difficulty: sampleExercise.difficulty,
          intensity: sampleExercise.intensity,
          field_size: sampleExercise.fieldSize,
          description: sampleExercise.description,
          organization: sampleExercise.organization,
          equipment: sampleExercise.equipment,
          coaching_points: sampleExercise.coachingPoints,
          common_mistakes: sampleExercise.commonMistakes,
          progression: sampleExercise.progression,
          regression: sampleExercise.regression,
          alternative: sampleExercise.alternative,
          load_control: sampleExercise.loadControl,
          age_groups: sampleExercise.ageGroups,
          goals: sampleExercise.goals,
          tags: sampleExercise.tags,
          external_video_url: sampleExercise.externalVideoUrl,
          status: sampleExercise.status,
          library_tier: sampleExercise.libraryTier,
          source: sampleExercise.source,
        },
      ],
    },
    null,
    2,
  );

  downloadTextFile(
    "Futsal-Exercise-Import-Template.json",
    content,
    "application/json;charset=utf-8",
  );
}

export function downloadExerciseImportCsvTemplate() {
  const csvRecord: Record<(typeof csvHeaders)[number], unknown> = {
    code: sampleExercise.code,
    title: sampleExercise.title,
    category: sampleExercise.category,
    exercise_type: sampleExercise.exerciseType,
    player_format: sampleExercise.playerFormat,
    min_players: sampleExercise.minPlayers,
    max_players: sampleExercise.maxPlayers,
    duration_minutes: sampleExercise.durationMinutes,
    difficulty: sampleExercise.difficulty,
    intensity: sampleExercise.intensity,
    field_size: sampleExercise.fieldSize,
    description: sampleExercise.description,
    organization: sampleExercise.organization,
    equipment: sampleExercise.equipment,
    coaching_points: sampleExercise.coachingPoints,
    common_mistakes: sampleExercise.commonMistakes,
    progression: sampleExercise.progression,
    regression: sampleExercise.regression,
    alternative: sampleExercise.alternative,
    load_control: sampleExercise.loadControl,
    age_groups: sampleExercise.ageGroups,
    goals: sampleExercise.goals,
    tags: sampleExercise.tags,
    external_video_url: sampleExercise.externalVideoUrl,
    status: sampleExercise.status,
    library_tier: sampleExercise.libraryTier,
    source: sampleExercise.source,
  };

  const content = [
    csvHeaders.join(";"),
    csvHeaders.map((header) => escapeCsvValue(csvRecord[header])).join(";"),
  ].join("\n");

  downloadTextFile(
    "Futsal-Exercise-Import-Template.csv",
    `\uFEFF${content}`,
    "text/csv;charset=utf-8",
  );
}
