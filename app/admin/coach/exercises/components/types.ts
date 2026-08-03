export type ExerciseStatus = "draft" | "active" | "archived";

export type ExerciseDifficulty = "easy" | "medium" | "hard" | "advanced";

export type ExerciseLibraryTier = "custom" | "core" | "signature" | "community";

export type ExerciseIntensity = "low" | "medium" | "high" | "variable";

export type ExerciseFieldSize =
  | "small"
  | "medium"
  | "large"
  | "full_court"
  | "custom";

export type ExerciseGoal = {
  id: string;
  goal: string;
};

export type ExerciseTag = {
  id: string;
  tag: string;
};

export type ExerciseRow = {
  id: string;

  // Основная информация
  code: string | null;
  title: string;
  description: string | null;
  organization: string | null;

  // Классификация
  category: string;
  subcategory: string | null;
  exercise_type: string;
  primary_goal: string | null;

  // Методика
  coaching_points: string | null;
  common_mistakes: string | null;
  progression: string | null;
  regression: string | null;
  alternative: string | null;
  load_control: string | null;

  // Нагрузка и организация
  duration_minutes: number;
  difficulty: ExerciseDifficulty;
  intensity: ExerciseIntensity | null;
  field_size: ExerciseFieldSize | null;
  equipment: string | null;

  // Игроки и возраст
  player_format: string | null;
  min_players: number | null;
  max_players: number | null;
  age_groups: string[];

  // Медиа
  cover_image_path: string | null;
  diagram_image_path: string | null;
  video_path: string | null;
  external_video_url: string | null;

  // Библиотека
  library_tier: ExerciseLibraryTier;
  source: string | null;
  is_system: boolean;

  // Статус и системные поля
  status: ExerciseStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;

  // Связанные данные
  exercise_goals: ExerciseGoal[];
  exercise_tags: ExerciseTag[];
};

export type ExerciseStatsData = {
  total: number;
  active: number;
  draft: number;
  archived: number;
};

export const categoryLabels: Record<string, string> = {
  warm_up: "Розминка",
  technical: "Техніка",
  tactical: "Тактика",
  passing: "Передачі",
  possession: "Контроль мʼяча",
  transition: "Перехідні фази",
  pressing: "Пресинг",
  defending: "Захист",
  attacking: "Атака",
  finishing: "Завершення / удари",
  set_pieces: "Стандарти",
  complex: "Комплексна",
  game: "Ігрова",
  fitness: "Фізична робота",
  physical: "Фізична підготовка",
  goalkeeper: "Воротарі",
  recovery: "Відновлення",
  cool_down: "Заминка",
  other: "Інше",
};


export const goalLabels: Record<string, string> = {
  pressing: "Пресинг",
  playing_out_of_pressing: "Вихід з-під пресингу",
  passing: "Передачі",
  ball_control: "Контроль мʼяча",
  positional_attack: "Позиційна атака",
  attacking_transition: "Перехід в атаку",
  defensive_transition: "Перехід в захист",
  finishing: "Завершення",
  shooting: "Удари",
  individual_defending: "Індивідуальний захист",
  team_defending: "Командний захист",
  decision_making: "Прийняття рішень",
  set_pieces: "Стандарти",
  corners: "Кутові",
  kick_ins: "Аути",
  free_kicks: "Штрафні",
  penalties: "Пенальті",
  power_play: "Гра в більшості",
  penalty_kill: "Гра в меншості",
  physical_preparation: "Фізична підготовка",
  goalkeeper_preparation: "Воротарська підготовка",
  recovery: "Відновлення",
};

export const typeLabels: Record<string, string> = {
  technical: "Технічна",
  tactical: "Тактична",
  complex: "Комплексна",
  game: "Ігрова",
  physical: "Фізична",
  goalkeeper: "Воротарська",
  recovery: "Відновлювальна",
  other: "Інше",
  individual: "Індивідуальна",
  pair: "У парах",
  group: "Групова",
  team: "Командна",
  circuit: "Кругове тренування",
};

export const difficultyLabels: Record<ExerciseDifficulty, string> = {
  easy: "Легка",
  medium: "Середня",
  hard: "Складна",
  advanced: "Просунута",
};

export const statusLabels: Record<ExerciseStatus, string> = {
  draft: "Чернетка",
  active: "Активна",
  archived: "Архів",
};

export const tierLabels: Record<ExerciseLibraryTier, string> = {
  custom: "Власна",
  core: "Базова",
  signature: "Фірмова",
  community: "Спільнота",
};

export const intensityLabels: Record<ExerciseIntensity, string> = {
  low: "Низька",
  medium: "Середня",
  high: "Висока",
  variable: "Змінна",
};

export const fieldSizeLabels: Record<ExerciseFieldSize, string> = {
  small: "Мала зона",
  medium: "Середня зона",
  large: "Велика зона",
  full_court: "Увесь майданчик",
  custom: "Довільний розмір",
};

export const ageGroupLabels: Record<string, string> = {
  u6: "U6",
  u7: "U7",
  u8: "U8",
  u9: "U9",
  u10: "U10",
  u11: "U11",
  u12: "U12",
  u13: "U13",
  u14: "U14",
  u15: "U15",
  u16: "U16",
  u17: "U17",
  u18: "U18",
  adults: "Дорослі",
};

export function playersLabel(
  minPlayers: number | null,
  maxPlayers: number | null,
): string {
  if (minPlayers !== null && maxPlayers !== null) {
    if (minPlayers === maxPlayers) {
      return `${minPlayers}`;
    }

    return `${minPlayers}–${maxPlayers}`;
  }

  if (minPlayers !== null) {
    return `від ${minPlayers}`;
  }

  if (maxPlayers !== null) {
    return `до ${maxPlayers}`;
  }

  return "Не вказано";
}

export function exerciseCodeLabel(code: string | null): string {
  return code?.trim() || "Без коду";
}

export function ageGroupsLabel(ageGroups: string[]): string[] {
  return ageGroups.map((ageGroup) => {
    const normalizedValue = ageGroup.toLowerCase();

    return ageGroupLabels[normalizedValue] ?? ageGroup.toUpperCase();
  });
}
