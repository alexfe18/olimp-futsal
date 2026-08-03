"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import type {
  ExerciseMediaKind,
  ExerciseMediaPreviewFilter,
  ExerciseMediaPreviewRow,
} from "../types";

const filterLabels: Record<ExerciseMediaPreviewFilter, string> = {
  all: "усі файли",
  ready: "нові медіа",
  errors: "файли з помилками",
  replacements: "заміни існуючих медіа",
};

const kindLabels: Record<ExerciseMediaKind, string> = {
  cover: "Обкладинка",
  diagram: "Схема",
};

type MediaImportPreviewTableProps = {
  rows: ExerciseMediaPreviewRow[];
  totalRows: number;
  activeFilter: ExerciseMediaPreviewFilter;
};

function MediaPreview({ file, alt }: { file: File; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const reader = new FileReader();

    reader.onload = () => {
      setUrl(typeof reader.result === "string" ? reader.result : null);
    };
    reader.onerror = () => setUrl(null);
    reader.readAsDataURL(file);

    return () => reader.abort();
  }, [file]);

  if (!url) {
    return <div className="h-16 w-24 animate-pulse rounded-xl bg-slate-100" />;
  }

  return (
    <div className="relative h-16 w-24 overflow-hidden rounded-xl bg-slate-100">
      <Image
        src={url}
        alt={alt}
        fill
        sizes="96px"
        unoptimized
        className="object-cover"
      />
    </div>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

export default function MediaImportPreviewTable({
  rows,
  totalRows,
  activeFilter,
}: MediaImportPreviewTableProps) {
  return (
    <section
      id="exercise-media-import-preview"
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
          Файли з помилками не будуть завантажені.
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
            У цій групі немає файлів
          </h3>
          <p className="mx-auto mt-2 max-w-xl font-semibold leading-7 text-slate-500">
            Оберіть інший підсумковий фільтр, щоб повернутися до результатів
            перевірки.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-5 py-4 font-black">Preview</th>
                <th className="px-5 py-4 font-black">Файл</th>
                <th className="px-5 py-4 font-black">Вправа</th>
                <th className="px-5 py-4 font-black">Тип</th>
                <th className="px-5 py-4 font-black">Перевірка</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={`${row.rowNumber}-${row.sourcePath}`} className="align-top">
                  <td className="px-5 py-4">
                    <MediaPreview
                      file={row.file}
                      alt={`Попередній перегляд ${row.fileName}`}
                    />
                  </td>
                  <td className="min-w-72 px-5 py-4">
                    <p className="break-all font-black text-slate-950">
                      {row.fileName}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {formatFileSize(row.file.size)}
                      {row.width && row.height
                        ? ` · ${row.width}×${row.height}px`
                        : ""}
                    </p>
                    {row.sourcePath !== row.fileName ? (
                      <p className="mt-1 break-all text-xs font-semibold text-slate-400">
                        {row.sourcePath}
                      </p>
                    ) : null}
                  </td>
                  <td className="min-w-64 px-5 py-4">
                    <p className="font-mono text-sm font-black text-sky-700">
                      {row.code ?? "—"}
                    </p>
                    <p className="mt-1 font-black text-slate-950">
                      {row.exercise?.title ?? "Вправу не визначено"}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-700">
                      {row.kind ? kindLabels[row.kind] : "—"}
                    </span>
                  </td>
                  <td className="min-w-80 px-5 py-4">
                    {row.issues.length > 0 ? (
                      <ul className="space-y-1.5 text-sm font-bold text-rose-700">
                        {row.issues.map((issue, index) => (
                          <li key={`${row.rowNumber}-${index}`}>{issue}</li>
                        ))}
                      </ul>
                    ) : row.status === "replacement" ? (
                      <div>
                        <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-black text-amber-800">
                          Буде замінено
                        </span>
                        <p className="mt-2 break-all text-xs font-semibold text-slate-500">
                          Поточний файл: {row.existingPath}
                        </p>
                      </div>
                    ) : (
                      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-800">
                        Готово до додавання
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
