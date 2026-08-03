import type { ExerciseMediaPreviewFilter } from "../types";

type MediaImportSummaryFiltersProps = {
  activeFilter: ExerciseMediaPreviewFilter;
  counts: Record<ExerciseMediaPreviewFilter, number>;
  onChange: (filter: ExerciseMediaPreviewFilter) => void;
};

const items = [
  {
    key: "all",
    label: "Усього",
    icon: "🖼️",
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
    key: "replacements",
    label: "Заміни",
    icon: "↻",
    accent: "bg-amber-100 text-amber-800",
  },
] as const satisfies ReadonlyArray<{
  key: ExerciseMediaPreviewFilter;
  label: string;
  icon: string;
  accent: string;
}>;

export default function MediaImportSummaryFilters({
  activeFilter,
  counts,
  onChange,
}: MediaImportSummaryFiltersProps) {
  return (
    <section
      aria-label="Фільтри результатів перевірки медіа"
      className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-3 shadow-sm"
    >
      <div
        role="tablist"
        aria-label="Статуси файлів медіа"
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
              aria-controls="exercise-media-import-preview"
              disabled={isDisabled}
              onClick={() => onChange(item.key)}
              className={`flex min-w-0 items-center gap-3 rounded-2xl px-3 py-3 text-left outline-none transition focus-visible:ring-4 focus-visible:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-45 ${
                isActive
                  ? "bg-sky-50 shadow-sm ring-2 ring-sky-300"
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
