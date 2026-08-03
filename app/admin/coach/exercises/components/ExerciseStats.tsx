import type { ExerciseStatsData } from "./types";

type ExerciseStatsProps = {
  stats: ExerciseStatsData;
};

const items = [
  {
    key: "total",
    label: "Усього",
    icon: "📚",
    accent: "bg-slate-950 text-white",
  },
  {
    key: "active",
    label: "Активні",
    icon: "✓",
    accent: "bg-emerald-100 text-emerald-700",
  },
  {
    key: "draft",
    label: "Чернетки",
    icon: "✎",
    accent: "bg-amber-100 text-amber-800",
  },
  {
    key: "archived",
    label: "В архіві",
    icon: "□",
    accent: "bg-slate-100 text-slate-600",
  },
] as const;

export default function ExerciseStats({ stats }: ExerciseStatsProps) {
  return (
    <section
      aria-label="Статистика бібліотеки вправ"
      className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-3 shadow-sm"
    >
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex min-w-0 items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-slate-50"
          >
            <span
              aria-hidden="true"
              className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${item.accent}`}
            >
              {item.icon}
            </span>

            <div className="min-w-0">
              <strong className="block text-xl font-black leading-none text-slate-950">
                {stats[item.key]}
              </strong>

              <span className="mt-1 block truncate text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                {item.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
