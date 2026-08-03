import type { ChangeEvent, DragEvent } from "react";

type MediaImportFilePanelProps = {
  sourceLabel: string | null;
  isReading: boolean;
  onFileSelect: (files: File[]) => void;
};

export default function MediaImportFilePanel({
  sourceLabel,
  isReading,
  onFileSelect,
}: MediaImportFilePanelProps) {
  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) onFileSelect(files);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length > 0) onFileSelect(files);
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-600">
          Крок 1
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">
          Оберіть ZIP або зображення
        </h2>
        <p className="mt-2 max-w-3xl font-semibold leading-7 text-slate-500">
          Називайте файли за кодом вправи:{" "}
          <code className="whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5">
            TECH-001-cover.png
          </code>{" "}
          або{" "}
          <code className="whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5">
            TECH-001-diagram.png
          </code>
          . Підтримуються PNG, JPG і WEBP до 10 МБ кожен.
        </p>
      </div>

      <label
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        className="mt-6 flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed border-slate-300 bg-slate-50 px-6 text-center transition hover:border-sky-400 hover:bg-sky-50/60"
      >
        <input
          type="file"
          accept=".zip,.png,.jpg,.jpeg,.webp,application/zip,image/png,image/jpeg,image/webp"
          multiple
          onChange={handleInputChange}
          className="sr-only"
        />

        <span className="text-5xl" aria-hidden="true">
          {isReading ? "⏳" : sourceLabel ? "✅" : "🖼️"}
        </span>
        <span className="mt-4 text-xl font-black text-slate-950">
          {isReading
            ? "Розпаковуємо та перевіряємо файли..."
            : sourceLabel
              ? sourceLabel
              : "Перетягніть ZIP або зображення сюди"}
        </span>
        <span className="mt-2 font-semibold text-slate-500">
          {sourceLabel
            ? "Можна обрати інший пакет."
            : "Один ZIP до 100 МБ або кілька окремих зображень"}
        </span>
      </label>

      <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50 px-5 py-4 text-sm font-semibold leading-6 text-sky-900">
        ZIP має бути стандартним, без пароля та ZIP64. Папки всередині дозволені:
        система використовує назву самого файла й ігнорує службові файли macOS.
      </div>
    </section>
  );
}
