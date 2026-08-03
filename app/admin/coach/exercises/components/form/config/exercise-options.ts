import type {
  ExerciseDifficulty,
  ExerciseFormValues,
} from "../types/exercise-form";

export const categoryOptions = [
  ["warm_up", "Розминка"],
  ["technical", "Техніка"],
  ["tactical", "Тактика"],
  ["passing", "Передачі"],
  ["possession", "Контроль м’яча"],
  ["transition", "Перехідні фази"],
  ["pressing", "Пресинг"],
  ["defending", "Захист"],
  ["attacking", "Атака"],
  ["finishing", "Завершення / удари"],
  ["set_pieces", "Стандарти"],
  ["complex", "Комплексна"],
  ["game", "Ігрова"],
  ["fitness", "Фізична робота"],
  ["goalkeeper", "Воротарі"],
  ["recovery", "Відновлення"],
  ["cool_down", "Заминка"],
  ["other", "Інше"],
] as const;

export const typeOptions = [
  ["technical", "Технічна"],
  ["tactical", "Тактична"],
  ["complex", "Комплексна"],
  ["game", "Ігрова"],
  ["physical", "Фізична"],
  ["goalkeeper", "Воротарська"],
  ["recovery", "Відновлювальна"],
  ["other", "Інше"],
] as const;

export const formatOptions = [
  ["", "Не вказано"],
  ["individual", "Індивідуально"],
  ["without_opposition", "Без суперника"],
  ["1v1", "1v1"],
  ["2v1", "2v1"],
  ["2v2", "2v2"],
  ["3v1", "3v1"],
  ["3v2", "3v2"],
  ["3v3", "3v3"],
  ["4v2", "4v2"],
  ["4v3", "4v3"],
  ["4v4", "4v4"],
  ["5v4", "5v4"],
  ["5v5", "5v5"],
  ["numbers_up", "Гра в більшості"],
  ["numbers_down", "Гра в меншості"],
  ["full_team", "Повний склад"],
  ["other", "Інше"],
] as const;

export const difficultyOptions: ReadonlyArray<
  readonly [ExerciseDifficulty, string]
> = [
  ["easy", "Легка"],
  ["medium", "Середня"],
  ["hard", "Складна"],
  ["advanced", "Просунута"],
];

export const goalOptions = [
  ["pressing", "Пресинг"],
  ["playing_out_of_pressing", "Вихід з-під пресингу"],
  ["passing", "Передачі"],
  ["ball_control", "Контроль м’яча"],
  ["positional_attack", "Позиційна атака"],
  ["attacking_transition", "Перехід в атаку"],
  ["defensive_transition", "Перехід в захист"],
  ["finishing", "Завершення"],
  ["shooting", "Удари"],
  ["individual_defending", "Індивідуальний захист"],
  ["team_defending", "Командний захист"],
  ["decision_making", "Прийняття рішень"],
  ["set_pieces", "Стандарти"],
  ["corners", "Кутові"],
  ["kick_ins", "Аути"],
  ["free_kicks", "Штрафні"],
  ["penalties", "Пенальті"],
  ["power_play", "Гра в більшості"],
  ["penalty_kill", "Гра в меншості"],
  ["physical_preparation", "Фізична підготовка"],
  ["goalkeeper_preparation", "Воротарська підготовка"],
  ["recovery", "Відновлення"],
] as const;

export const ageOptions = [
  "U8–U10",
  "U11–U12",
  "U13–U14",
  "U15–U17",
  "Дорослі",
] as const;

export const emptyExerciseForm: ExerciseFormValues = {
  title: "",
  category: "complex",
  exerciseType: "complex",
  playerFormat: "",
  minPlayers: "",
  maxPlayers: "",
  durationMinutes: "10",
  difficulty: "medium",
  description: "",
  organization: "",
  equipment: "",
  coachingPoints: "",
  commonMistakes: "",
  externalVideoUrl: "",
};

export function getOptionLabel(
  options: ReadonlyArray<readonly [string, string]>,
  value: string,
  fallback: string,
) {
  return options.find(([optionValue]) => optionValue === value)?.[1] ?? fallback;
}
