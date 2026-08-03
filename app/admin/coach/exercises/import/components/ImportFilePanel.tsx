import type { ChangeEvent, DragEvent } from "react";

import type { ExerciseImportFormat } from "../types";

type ImportFilePanelProps = {
  fileName: string | null;
  format: ExerciseImportFormat | null;
  isReading: boolean;
  onFileSelect: (file: File) => void;
  onDownloadJsonTemplate: () => void;
  onDownloadCsvTemplate: () => void;
};

export default function ImportFilePanel({
  fileName,
  format,
  isReading,
  onFileSelect,
  onDownloadJsonTemplate,
  onDownloadCsvTemplate,
}: ImportFilePanelProps) {
  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onFileSelect(file);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-600">
            Крок 1
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Оберіть файл бібліотеки
          </h2>
          <p className="mt-2 max-w-2xl font-semibold leading-7 text-slate-500">
            Підтримуються JSON і CSV до 5 МБ. Масиви у CSV розділяються
            <span className="whitespace-nowrap">
              {" "}символом{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5">|</code>.
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onDownloadJsonTemplate}
            className="min-h-11 rounded-full border border-slate-200 px-5 font-black text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
          >
            JSON шаблон
          </button>
          <button
            type="button"
            onClick={onDownloadCsvTemplate}
            className="min-h-11 rounded-full border border-slate-200 px-5 font-black text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
          >
            CSV шаблон
          </button>
        </div>
      </div>

      <label
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        className="mt-6 flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed border-slate-300 bg-slate-50 px-6 text-center transition hover:border-sky-400 hover:bg-sky-50/60"
      >
        <input
          type="file"
          accept=".json,.csv,application/json,text/csv,text/plain"
          onChange={handleInputChange}
          className="sr-only"
        />

        <span className="text-5xl" aria-hidden="true">
          {isReading ? "⏳" : fileName ? "✅" : "📥"}
        </span>
        <span className="mt-4 text-xl font-black text-slate-950">
          {isReading
            ? "Читаємо файл..."
            : fileName
              ? fileName
              : "Перетягніть файл сюди або натисніть для вибору"}
        </span>
        <span className="mt-2 font-semibold text-slate-500">
          {format
            ? `Формат: ${format.toUpperCase()}. Можна обрати інший файл.`
            : "JSON або CSV, максимум 5 МБ"}
        </span>
      </label>
    </section>
  );
}
