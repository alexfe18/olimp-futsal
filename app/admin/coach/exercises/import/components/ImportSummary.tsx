import Link from "next/link";

import type { ExerciseImportSummary } from "../types";

type ImportSummaryProps = {
  summary: ExerciseImportSummary;
  onReset: () => void;
};

const resultLabels = {
  created: "Створено",
  updated: "Оновлено",
  skipped: "Пропущено",
  error: "Помилка",
} as const;

export default function ImportSummary({
  summary,
  onReset,
}: ImportSummaryProps) {
  return (
    <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-600">
        Імпорт завершено
      </p>
      <h2 className="mt-2 text-3xl font-black text-slate-950">
        Результат завантаження
      </h2>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Створено", summary.created, "text-emerald-700 bg-emerald-50"],
          ["Оновлено", summary.updated, "text-sky-700 bg-sky-50"],
          ["Пропущено", summary.skipped, "text-amber-700 bg-amber-50"],
          ["Помилки", summary.failed, "text-rose-700 bg-rose-50"],
        ].map(([label, value, className]) => (
          <div
            key={String(label)}
            className={`rounded-3xl p-5 ${String(className)}`}
          >
            <p className="text-3xl font-black">{String(value)}</p>
            <p className="mt-1 font-black">{String(label)}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 max-h-80 overflow-auto rounded-3xl border border-slate-200">
        <ul className="divide-y divide-slate-100">
          {summary.results.map((result) => (
            <li
              key={`${result.rowNumber}-${result.code}`}
              className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-black text-slate-950">
                  {result.code} — {result.title}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {result.message}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-700">
                {resultLabels[result.status]}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          href="/admin/coach/exercises"
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-sky-400 px-6 font-black text-slate-950 transition hover:bg-sky-300"
        >
          Відкрити бібліотеку
        </Link>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 px-6 font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Імпортувати інший файл
        </button>
      </div>
    </section>
  );
}
