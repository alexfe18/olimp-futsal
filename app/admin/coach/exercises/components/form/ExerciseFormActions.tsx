import type { ExerciseFormMode } from "./types/exercise-form";

type ExerciseFormActionsProps = {
  isSaving: boolean;
  mode: ExerciseFormMode;
  onCancel: () => void;
  formId: string;
  onSaveDraft: () => void;
};

export default function ExerciseFormActions({
  isSaving,
  mode,
  onCancel,
  formId,
  onSaveDraft,
}: ExerciseFormActionsProps) {
  const isEdit = mode === "edit";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={isSaving}
        onClick={onCancel}
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-sm font-black text-white transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Скасувати
      </button>

      {!isEdit ? (
        <button
          type="button"
          disabled={isSaving}
          onClick={onSaveDraft}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-sky-300/30 bg-sky-400/10 px-5 text-sm font-black text-sky-100 transition hover:border-sky-300/50 hover:bg-sky-400/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Збереження..." : "Зберегти чернетку"}
        </button>
      ) : null}

      <button
        type="submit"
        form={formId}
        disabled={isSaving}
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-sky-400 px-6 text-sm font-black text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSaving
          ? "Збереження..."
          : isEdit
            ? "Зберегти зміни"
            : "Опублікувати"}
      </button>
    </div>
  );
}
