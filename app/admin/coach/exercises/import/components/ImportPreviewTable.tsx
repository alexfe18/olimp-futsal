import {
  categoryLabels,
  statusLabels,
  typeLabels,
} from "../../components/types";

import type {
  ExerciseImportDifficulty,
  ExerciseImportPreviewFilter,
  ExerciseImportPreviewRow,
} from "../types";

const importDifficultyLabels: Record<ExerciseImportDifficulty, string> = {
  easy: "Легка",
  medium: "Середня",
  hard: "Складна",
  advanced: "Просунута",
};

const filterLabels: Record<ExerciseImportPreviewFilter, string> = {
  all: "усі рядки",
  ready: "готові до імпорту",
  errors: "рядки з помилками",
  duplicates: "дублікати",
};

type ImportPreviewTableProps = {
  rows: ExerciseImportPreviewRow[];
  totalRows: number;
  activeFilter: ExerciseImportPreviewFilter;
};

function recordLabel(
  labels: Record<string, string>,
  value: string | undefined,
) {
  if (!value) return "—";
  return labels[value] ?? value;
}

export default function ImportPreviewTable({
  rows,
  totalRows,
  activeFilter,
}: ImportPreviewTableProps) {
  return (
    <section
      id="exercise-import-preview"
      role="tabpanel"
      className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-200 px-6 py-5 sm:px-8">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-600">
          Крок 2
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">
          Попередня перевірка
        </h2>
        <p className="mt-2 font-semibold text-slate-500">
          Показано {rows.length} із {totalRows}: {filterLabels[activeFilter]}.
          Рядки з помилками не будуть імпортовані.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="px-6 py-14 text-center sm:px-8">
          <div
            aria-hidden="true"
            className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl"
          >
            ✓
          </div>
          <h3 className="mt-4 text-xl font-black text-slate-950">
            У цій групі немає рядків
          </h3>
          <p className="mx-auto mt-2 max-w-xl font-semibold leading-7 text-slate-500">
            Оберіть інший підсумковий фільтр, щоб повернутися до результатів
            попередньої перевірки.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-5 py-4 font-black">Рядок</th>
                <th className="px-5 py-4 font-black">Код / назва</th>
                <th className="px-5 py-4 font-black">Класифікація</th>
                <th className="px-5 py-4 font-black">Статус</th>
                <th className="px-5 py-4 font-black">Перевірка</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const record = row.record;
                const hasErrors = row.issues.length > 0;

                return (
                  <tr key={row.rowNumber} className="align-top">
                    <td className="px-5 py-4 font-black text-slate-400">
                      {row.rowNumber}
                    </td>
                    <td className="min-w-64 px-5 py-4">
                      <p className="font-black text-slate-950">
                        {record?.title || "Назву не вказано"}
                      </p>
                      <p className="mt-1 font-mono text-sm font-bold text-sky-700">
                        {record?.code || "—"}
                      </p>
                      {row.duplicate ? (
                        <p className="mt-2 text-sm font-bold text-amber-700">
                          Дублікат: {row.duplicate.title}
                        </p>
                      ) : null}
                    </td>
                    <td className="min-w-56 px-5 py-4 text-sm font-bold text-slate-600">
                      <p>
                        {recordLabel(categoryLabels, record?.category)} ·{" "}
                        {recordLabel(typeLabels, record?.exerciseType)}
                      </p>
                      <p className="mt-1">
                        {record
                          ? importDifficultyLabels[record.difficulty]
                          : "—"}
                        {record ? ` · ${record.durationMinutes} хв` : ""}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-700">
                        {record
                          ? statusLabels[record.status] ?? record.status
                          : "—"}
                      </span>
                    </td>
                    <td className="min-w-80 px-5 py-4">
                      {hasErrors ? (
                        <ul className="space-y-1.5 text-sm font-bold text-rose-700">
                          {row.issues.map((issue, index) => (
                            <li key={`${issue.field}-${index}`}>
                              {issue.message}
                            </li>
                          ))}
                        </ul>
                      ) : row.duplicate ? (
                        <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-black text-amber-800">
                          Знайдено дублікат
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-800">
                          Готово до імпорту
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
