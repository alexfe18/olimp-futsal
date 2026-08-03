import { categoryLabels, statusLabels, typeLabels } from "./types";

type ExerciseFiltersProps = {
  search: string;
  category: string;
  type: string;
  status: string;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onReset: () => void;
};

export default function ExerciseFilters({
  search,
  category,
  type,
  status,
  hasActiveFilters,
  onSearchChange,
  onCategoryChange,
  onTypeChange,
  onStatusChange,
  onReset,
}: ExerciseFiltersProps) {
  return (
    <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_210px_210px_190px_auto]">
        <label className="sr-only" htmlFor="exercise-search">
          Пошук вправ
        </label>

        <input
          id="exercise-search"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Пошук за назвою, описом, цілями або тегами"
          className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
        />

        <label className="sr-only" htmlFor="exercise-category">
          Категорія
        </label>

        <select
          id="exercise-category"
          value={category}
          onChange={(event) => onCategoryChange(event.target.value)}
          className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 font-black outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
        >
          <option value="all">Усі категорії</option>

          {Object.entries(categoryLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="exercise-type">
          Тип вправи
        </label>

        <select
          id="exercise-type"
          value={type}
          onChange={(event) => onTypeChange(event.target.value)}
          className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 font-black outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
        >
          <option value="all">Усі типи</option>

          {Object.entries(typeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="exercise-status">
          Статус
        </label>

        <select
          id="exercise-status"
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
          className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 font-black outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
        >
          <option value="all">Усі статуси</option>

          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={!hasActiveFilters}
          onClick={onReset}
          className="min-h-12 rounded-2xl border border-slate-200 px-5 font-black transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Скинути
        </button>
      </div>
    </section>
  );
}
