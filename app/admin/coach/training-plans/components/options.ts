import type {
  TrainingPlanIntensity,
  TrainingPlanStatus,
} from "./types";

export const ageGroupOptions = [
  "U8–U10",
  "U11–U12",
  "U13–U14",
  "U15–U17",
  "Дорослі",
] as const;

export const statusOptions: ReadonlyArray<{
  value: TrainingPlanStatus;
  label: string;
}> = [
  { value: "draft", label: "Чернетка" },
  { value: "planned", label: "Заплановано" },
  { value: "published", label: "Опубліковано" },
  { value: "in_progress", label: "Триває" },
  { value: "completed", label: "Завершено" },
  { value: "cancelled", label: "Скасовано" },
];

export const intensityOptions: ReadonlyArray<{
  value: TrainingPlanIntensity;
  label: string;
  description: string;
}> = [
  {
    value: "low",
    label: "Низька",
    description: "Легка технічна або відновлювальна сесія.",
  },
  {
    value: "medium",
    label: "Середня",
    description: "Збалансована робота зі стабільним навантаженням.",
  },
  {
    value: "high",
    label: "Висока",
    description: "Висока щільність і короткі паузи між вправами.",
  },
  {
    value: "recovery",
    label: "Відновлення",
    description: "Сесія після матчу або важкого тренувального циклу.",
  },
];

export const statusLabels: Record<TrainingPlanStatus, string> = {
  draft: "Чернетка",
  planned: "Заплановано",
  published: "Опубліковано",
  in_progress: "Триває",
  completed: "Завершено",
  cancelled: "Скасовано",
};

export const intensityLabels: Record<TrainingPlanIntensity, string> = {
  low: "Низька",
  medium: "Середня",
  high: "Висока",
  recovery: "Відновлення",
};

export const statusClasses: Record<TrainingPlanStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  planned: "bg-sky-100 text-sky-700",
  published: "bg-cyan-100 text-cyan-800",
  in_progress: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};


export const trainingBlockTypeOptions: ReadonlyArray<{
  value: string;
  label: string;
}> = [
  { value: "warm_up", label: "Розминка" },
  { value: "technical", label: "Техніка" },
  { value: "passing", label: "Передачі" },
  { value: "possession", label: "Контроль мʼяча" },
  { value: "transition", label: "Перехідні фази" },
  { value: "pressing", label: "Пресинг" },
  { value: "defending", label: "Захист" },
  { value: "attacking", label: "Атака" },
  { value: "finishing", label: "Завершення / удари" },
  { value: "set_pieces", label: "Стандарти" },
  { value: "complex", label: "Комплексний блок" },
  { value: "game", label: "Ігровий блок" },
  { value: "fitness", label: "Фізична робота" },
  { value: "goalkeeper", label: "Воротарі" },
  { value: "recovery", label: "Відновлення" },
  { value: "cool_down", label: "Заминка" },
  { value: "custom", label: "Власний / інше" },
];

export const trainingBlockTypeLabels: Record<string, string> =
  Object.fromEntries(
    trainingBlockTypeOptions.map((option) => [option.value, option.label]),
  );
