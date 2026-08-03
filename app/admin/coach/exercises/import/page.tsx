"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import PageHero from "../components/PageHero";
import ImportFilePanel from "./components/ImportFilePanel";
import ImportPreviewTable from "./components/ImportPreviewTable";
import ImportSummary from "./components/ImportSummary";
import ImportSummaryFilters from "./components/ImportSummaryFilters";
import { parseExerciseImportFile } from "./data/exercise-import-parser";
import {
  attachExerciseImportDuplicates,
  importExercises,
} from "./data/exercise-import-service";
import {
  downloadExerciseImportCsvTemplate,
  downloadExerciseImportJsonTemplate,
} from "./data/exercise-import-template";
import { validateExerciseImportRows } from "./data/exercise-import-validator";

import type {
  ExerciseDuplicateStrategy,
  ExerciseImportFormat,
  ExerciseImportPreviewFilter,
  ExerciseImportPreviewRow,
  ExerciseImportProgress,
  ExerciseImportSummary as ExerciseImportSummaryData,
} from "./types";

export default function ExerciseImportPage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [format, setFormat] = useState<ExerciseImportFormat | null>(null);
  const [rows, setRows] = useState<ExerciseImportPreviewRow[]>([]);
  const [duplicateStrategy, setDuplicateStrategy] =
    useState<ExerciseDuplicateStrategy>("skip");
  const [previewFilter, setPreviewFilter] =
    useState<ExerciseImportPreviewFilter>("all");
  const [isReading, setIsReading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ExerciseImportProgress | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [summary, setSummary] =
    useState<ExerciseImportSummaryData | null>(null);

  const stats = useMemo(() => {
    const errors = rows.filter((row) => row.issues.length > 0).length;
    const duplicates = rows.filter(
      (row) => row.issues.length === 0 && row.duplicate !== null,
    ).length;
    const ready = rows.filter(
      (row) =>
        row.record !== null &&
        row.issues.length === 0 &&
        row.duplicate === null,
    ).length;
    const importable = ready + duplicates;

    return {
      all: rows.length,
      ready,
      errors,
      duplicates,
      importable,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (previewFilter === "ready") {
      return rows.filter(
        (row) =>
          row.record !== null &&
          row.issues.length === 0 &&
          row.duplicate === null,
      );
    }

    if (previewFilter === "errors") {
      return rows.filter((row) => row.issues.length > 0);
    }

    if (previewFilter === "duplicates") {
      return rows.filter(
        (row) => row.issues.length === 0 && row.duplicate !== null,
      );
    }

    return rows;
  }, [previewFilter, rows]);

  async function handleFileSelect(file: File) {
    setIsReading(true);
    setMessage(null);
    setSummary(null);
    setProgress(null);

    try {
      const parsedFile = await parseExerciseImportFile(file);
      const validatedRows = validateExerciseImportRows(parsedFile.rows);
      const rowsWithDuplicates = await attachExerciseImportDuplicates(
        validatedRows,
      );

      setFileName(file.name);
      setFormat(parsedFile.format);
      setRows(rowsWithDuplicates);
      setPreviewFilter("all");
    } catch (error) {
      console.error("Exercise import file error:", error);
      setFileName(null);
      setFormat(null);
      setRows([]);
      setMessage(
        error instanceof Error
          ? error.message
          : "Не вдалося прочитати файл імпорту.",
      );
    } finally {
      setIsReading(false);
    }
  }

  async function handleImport() {
    if (stats.importable === 0 || isImporting) return;

    setIsImporting(true);
    setMessage(null);
    setSummary(null);
    setProgress({ current: 0, total: stats.importable });

    try {
      const importSummary = await importExercises(
        rows,
        duplicateStrategy,
        setProgress,
      );
      setSummary(importSummary);
    } catch (error) {
      console.error("Exercise import error:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Не вдалося запустити імпорт вправ.",
      );
    } finally {
      setIsImporting(false);
    }
  }

  function resetImport() {
    setFileName(null);
    setFormat(null);
    setRows([]);
    setDuplicateStrategy("skip");
    setPreviewFilter("all");
    setMessage(null);
    setSummary(null);
    setProgress(null);
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/admin/coach/exercises"
          className="mb-4 inline-flex items-center gap-2 text-sm font-black text-sky-700 transition hover:text-sky-500"
        >
          ← До бібліотеки вправ
        </Link>

        <PageHero
          eyebrow="Робочий простір тренера"
          title="Імпорт вправ"
          description="Завантажуйте готові бібліотеки вправ із JSON або CSV, перевіряйте дані перед збереженням і безпечно обробляйте дублікати."
        />

        {message ? (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 font-bold text-rose-700"
          >
            {message}
          </div>
        ) : null}

        {summary ? (
          <ImportSummary summary={summary} onReset={resetImport} />
        ) : (
          <>
            <div className="mt-6">
              <ImportFilePanel
                fileName={fileName}
                format={format}
                isReading={isReading}
                onFileSelect={(file) => void handleFileSelect(file)}
                onDownloadJsonTemplate={downloadExerciseImportJsonTemplate}
                onDownloadCsvTemplate={downloadExerciseImportCsvTemplate}
              />
            </div>

            {rows.length > 0 ? (
              <>
                <ImportSummaryFilters
                  activeFilter={previewFilter}
                  counts={{
                    all: stats.all,
                    ready: stats.ready,
                    errors: stats.errors,
                    duplicates: stats.duplicates,
                  }}
                  onChange={setPreviewFilter}
                />

                <ImportPreviewTable
                  rows={filteredRows}
                  totalRows={stats.all}
                  activeFilter={previewFilter}
                />

                <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-600">
                    Крок 3
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    Підтвердження імпорту
                  </h2>

                  <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                    <label className="block">
                      <span className="font-black text-slate-700">
                        Що робити з вправами, код яких уже існує?
                      </span>
                      <select
                        value={duplicateStrategy}
                        onChange={(event) =>
                          setDuplicateStrategy(
                            event.target.value as ExerciseDuplicateStrategy,
                          )
                        }
                        className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-black outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 lg:max-w-xl"
                      >
                        <option value="skip">Пропустити дублікати</option>
                        <option value="update">
                          Оновити текстові дані, цілі та теги
                        </option>
                      </select>
                      <span className="mt-2 block text-sm font-semibold leading-6 text-slate-500">
                        Оновлення не змінює обкладинку, схему або відеофайл
                        існуючої вправи.
                      </span>
                    </label>

                    <button
                      type="button"
                      disabled={stats.importable === 0 || isImporting}
                      onClick={() => void handleImport()}
                      className="inline-flex min-h-13 items-center justify-center rounded-full bg-sky-400 px-7 font-black text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isImporting
                        ? `Імпорт ${progress?.current ?? 0}/${progress?.total ?? stats.importable}`
                        : `Імпортувати ${stats.importable} вправ`}
                    </button>
                  </div>

                  {isImporting && progress ? (
                    <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-sky-400 transition-all"
                        style={{
                          width: `${
                            progress.total > 0
                              ? (progress.current / progress.total) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  ) : null}
                </section>
              </>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
