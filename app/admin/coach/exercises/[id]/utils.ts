import { supabase } from "@/lib/supabase";
import type { Exercise, ExerciseDifficulty, ExerciseStatus } from "./types";

export const categoryLabels: Record<string, string> = {
  warm_up: "Розминка",
  technical: "Техніка",
  tactical: "Тактика",
  passing: "Передачі",
  possession: "Контроль м’яча",
  transition: "Перехідні фази",
  pressing: "Пресинг",
  defending: "Захист",
  attacking: "Атака",
  finishing: "Завершення / удари",
  set_pieces: "Стандарти",
  complex: "Комплексна",
  game: "Ігрова",
  fitness: "Фізична робота",
  goalkeeper: "Воротарі",
  recovery: "Відновлення",
  cool_down: "Заминка",
  other: "Інше",
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


export const playerFormatLabels: Record<string, string> = {
  individual: "Індивідуально",
  without_opposition: "Без суперника",
  "1v1": "1v1",
  "2v1": "2v1",
  "2v2": "2v2",
  "3v1": "3v1",
  "3v2": "3v2",
  "3v3": "3v3",
  "4v2": "4v2",
  "4v3": "4v3",
  "4v4": "4v4",
  "5v4": "5v4",
  "5v5": "5v5",
  numbers_up: "Гра в більшості",
  numbers_down: "Гра в меншості",
  full_team: "Повний склад",
  other: "Інше",
};

export const libraryTierLabels: Record<string, string> = {
  custom: "Власна",
  core: "Базова",
  signature: "Фірмова",
  community: "Спільнота",
  basic: "Базова",
  standard: "Стандартна",
  premium: "Розширена",
  featured: "Рекомендована",
};

export const goalLabels: Record<string, string> = {
  pressing: "Пресинг",
  playing_out_of_pressing: "Вихід з-під пресингу",
  passing: "Передачі",
  ball_control: "Контроль м’яча",
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

export function getPublicMediaUrl(path: string | null) {
  if (!path) return null;
  return supabase.storage.from("exercise-media").getPublicUrl(path).data
    .publicUrl;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function getPlayersLabel(min: number | null, max: number | null) {
  if (min !== null && max !== null)
    return min === max ? String(min) : `${min}–${max}`;
  if (min !== null) return `від ${min}`;
  if (max !== null) return `до ${max}`;
  return "Не вказано";
}

export function getStoragePaths(exercise: Exercise) {
  return [
    exercise.cover_image_path,
    exercise.diagram_image_path,
    exercise.video_path,
  ].filter((value): value is string => Boolean(value));
}
