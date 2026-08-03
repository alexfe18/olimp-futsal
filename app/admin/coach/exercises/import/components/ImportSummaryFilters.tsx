import type { ExerciseImportPreviewFilter } from "../types";

type ImportSummaryFiltersProps = {
  activeFilter: ExerciseImportPreviewFilter;
  counts: Record<ExerciseImportPreviewFilter, number>;
  onChange: (filter: ExerciseImportPreviewFilter) => void;
};

const items = [
  {
    key: "all",
    label: "Усього",
    icon: "📚",
    accent: "bg-slate-950 text-white",
  },
  {
    key: "ready",
    label: "Готові",
    icon: "✓",
    accent: "bg-emerald-100 text-emerald-700",
  },
  {
    key: "errors",
    label: "Помилки",
    icon: "!",
    accent: "bg-rose-100 text-rose-700",
  },
  {
    key: "duplicates",
    label: "Дублікати",
    icon: "≡",
    accent: "bg-amber-100 text-amber-800",
  },
] as const satisfies ReadonlyArray<{
  key: ExerciseImportPreviewFilter;
  label: string;
  icon: string;
  accent: string;
}>;

export default function ImportSummaryFilters({
  activeFilter,
  counts,
  onChange,
}: ImportSummaryFiltersProps) {
  return (
    <section
      aria-label="Фільтри результатів попередньої перевірки"
      className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-3 shadow-sm"
    >
      <div
        role="tablist"
        aria-label="Статуси рядків імпорту"
        className="grid grid-cols-2 gap-2 lg:grid-cols-4"
      >
        {items.map((item) => {
          const isActive = activeFilter === item.key;
          const isDisabled = item.key !== "all" && counts[item.key] === 0;

          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls="exercise-import-preview"
              disabled={isDisabled}
              onClick={() => onChange(item.key)}
              className={`flex min-w-0 items-center gap-3 rounded-2xl px-3 py-3 text-left outline-none transition focus-visible:ring-4 focus-visible:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-45 ${
                isActive
                  ? "bg-sky-50 ring-2 ring-sky-300 shadow-sm"
                  : "hover:bg-slate-50"
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${item.accent}`}
              >
                {item.icon}
              </span>

              <span className="min-w-0">
                <strong className="block text-xl font-black leading-none text-slate-950">
                  {counts[item.key]}
                </strong>
                <span className="mt-1 block truncate text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                  {item.label}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
