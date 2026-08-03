import Link from "next/link";
import type { Exercise } from "../types";

type Props = {
  exercise: Exercise;
  isProcessing: boolean;
  onArchive: () => void;
  onDelete: () => void;
};

export default function ExerciseActions({
  exercise,
  isProcessing,
  onArchive,
  onDelete,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <Link
        href="/admin/coach/exercises"
        className="font-black text-sky-700 transition hover:text-sky-500"
      >
        ← До бібліотеки вправ
      </Link>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/admin/coach/exercises/${exercise.id}/edit`}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 font-black text-white transition hover:bg-sky-500 hover:text-slate-950"
        >
          Редагувати
        </Link>
        <button
          type="button"
          disabled={isProcessing}
          onClick={onArchive}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-amber-300 px-5 font-black text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exercise.status === "archived" ? "Повернути" : "В архів"}
        </button>
        <button
          type="button"
          disabled={isProcessing}
          onClick={onDelete}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-rose-300 px-5 font-black text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Видалити
        </button>
      </div>
    </div>
  );
}
