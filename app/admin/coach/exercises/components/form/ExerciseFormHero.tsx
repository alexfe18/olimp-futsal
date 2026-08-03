import { ExerciseWorkspaceHero } from "../workspace";
import ExerciseFormActions from "./ExerciseFormActions";
import type {
  ExerciseFormMode,
  ExercisePersistedStatus,
} from "./types/exercise-form";

type ExerciseFormHeroProps = {
  mode: ExerciseFormMode;
  title?: string;
  status: ExercisePersistedStatus;
  isSaving: boolean;
  onCancel: () => void;
  formId: string;
  onSaveDraft: () => void;
};

const statusLabels: Record<ExercisePersistedStatus, string> = {
  draft: "Чернетка",
  active: "Активна",
  archived: "Архів",
};

const statusClasses: Record<ExercisePersistedStatus, string> = {
  draft: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  active: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
  archived: "border-slate-300/20 bg-white/10 text-slate-200",
};

export default function ExerciseFormHero({
  mode,
  title,
  status,
  isSaving,
  onCancel,
  formId,
  onSaveDraft,
}: ExerciseFormHeroProps) {
  const isEdit = mode === "edit";

  return (
    <ExerciseWorkspaceHero
      badge={
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-sky-300/30 bg-sky-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-sky-200">
            {isEdit ? "Редагування вправи" : "Нова вправа"}
          </span>
          <span
            className={`rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] ${statusClasses[status]}`}
          >
            {statusLabels[status]}
          </span>
        </div>
      }
      title={isEdit ? title?.trim() || "Редагування вправи" : "Створення вправи"}
      description={
        isEdit
          ? "Оновіть параметри, методику та медіа вправи в єдиному робочому просторі."
          : "Створіть вправу для бібліотеки клубу та майбутніх тренувальних планів."
      }
      actions={
        <ExerciseFormActions
          mode={mode}
          isSaving={isSaving}
          onCancel={onCancel}
          formId={formId}
          onSaveDraft={onSaveDraft}
        />
      }
    />
  );
}
