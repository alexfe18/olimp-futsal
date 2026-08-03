import Link from "next/link";

import EmptyState from "./ui/EmptyState";

type EmptyLibraryStateProps = {
  isLibraryEmpty: boolean;
  onResetFilters: () => void;
};

export default function EmptyLibraryState({
  isLibraryEmpty,
  onResetFilters,
}: EmptyLibraryStateProps) {
  if (isLibraryEmpty) {
    return (
      <EmptyState
        className="mt-5"
        icon="🏃"
        title="Бібліотека поки порожня"
        description="Створіть першу вправу вручну. Пізніше тут також з’явиться можливість імпортувати готові пакети вправ."
        actions={
          <Link
            href="/admin/coach/exercises/new"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-sky-400 px-6 font-black text-slate-950 transition hover:bg-sky-300"
          >
            Створити першу вправу
          </Link>
        }
      />
    );
  }

  return (
    <EmptyState
      className="mt-5"
      icon="🔎"
      title="Нічого не знайдено"
      description="Спробуйте змінити пошуковий запит або скинути активні фільтри."
      actions={
        <button
          type="button"
          onClick={onResetFilters}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 font-black text-white transition hover:bg-slate-800"
        >
          Скинути фільтри
        </button>
      }
    />
  );
}
