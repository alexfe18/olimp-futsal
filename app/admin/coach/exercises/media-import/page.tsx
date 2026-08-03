"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import PageHero from "../components/PageHero";
import MediaImportFilePanel from "./components/MediaImportFilePanel";
import MediaImportPreviewTable from "./components/MediaImportPreviewTable";
import MediaImportSummary from "./components/MediaImportSummary";
import MediaImportSummaryFilters from "./components/MediaImportSummaryFilters";
import { parseExerciseMediaSelection } from "./data/media-import-parser";
import {
  attachExerciseMediaTargets,
  importExerciseMedia,
} from "./data/media-import-service";

import type {
  ExerciseMediaImportProgress,
  ExerciseMediaImportSummary as ExerciseMediaImportSummaryData,
  ExerciseMediaPreviewFilter,
  ExerciseMediaPreviewRow,
  ExerciseMediaReplacementStrategy,
} from "./types";

export default function ExerciseMediaImportPage() {
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [rows, setRows] = useState<ExerciseMediaPreviewRow[]>([]);
  const [replacementStrategy, setReplacementStrategy] =
    useState<ExerciseMediaReplacementStrategy>("skip");
  const [previewFilter, setPreviewFilter] =
    useState<ExerciseMediaPreviewFilter>("all");
  const [isReading, setIsReading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] =
    useState<ExerciseMediaImportProgress | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [summary, setSummary] =
    useState<ExerciseMediaImportSummaryData | null>(null);

  const stats = useMemo(() => {
    const errors = rows.filter((row) => row.status === "error").length;
    const replacements = rows.filter(
      (row) => row.status === "replacement",
    ).length;
    const ready = rows.filter((row) => row.status === "ready").length;
    const importable =
      ready + (replacementStrategy === "replace" ? replacements : 0);

    return {
      all: rows.length,
      ready,
      errors,
      replacements,
      importable,
    };
  }, [replacementStrategy, rows]);

  const filteredRows = useMemo(() => {
    if (previewFilter === "ready") {
      return rows.filter((row) => row.status === "ready");
    }

    if (previewFilter === "errors") {
      return rows.filter((row) => row.status === "error");
    }

    if (previewFilter === "replacements") {
      return rows.filter((row) => row.status === "replacement");
    }

    return rows;
  }, [previewFilter, rows]);

  async function handleFileSelect(files: File[]) {
    setIsReading(true);
    setMessage(null);
    setSummary(null);
    setProgress(null);

    try {
      const parsedSelection = await parseExerciseMediaSelection(files);
      const rowsWithTargets = await attachExerciseMediaTargets(
        parsedSelection.rows,
      );

      setSourceLabel(parsedSelection.sourceLabel);
      setRows(rowsWithTargets);
      setPreviewFilter("all");
    } catch (error) {
      console.error("Exercise media selection error:", error);
      setSourceLabel(null);
      setRows([]);
      setMessage(
        error instanceof Error
          ? error.message
          : "Не вдалося прочитати пакет медіа.",
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

    const totalEligible =
      stats.ready + stats.replacements;
    setProgress({ current: 0, total: totalEligible });

    try {
      const importSummary = await importExerciseMedia(
        rows,
        replacementStrategy,
        setProgress,
      );
      setSummary(importSummary);
    } catch (error) {
      console.error("Exercise media import error:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Не вдалося запустити імпорт медіа.",
      );
    } finally {
      setIsImporting(false);
    }
  }

  function resetImport() {
    setSourceLabel(null);
    setRows([]);
    setReplacementStrategy("skip");
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
          title="Імпорт медіа вправ"
          description="Завантажуйте обкладинки та схеми пакетами, перевіряйте прив’язку за кодом вправи й безпечно керуйте замінами."
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
          <MediaImportSummary summary={summary} onReset={resetImport} />
        ) : (
          <>
            <div className="mt-6">
              <MediaImportFilePanel
                sourceLabel={sourceLabel}
                isReading={isReading}
                onFileSelect={(files) => void handleFileSelect(files)}
              />
            </div>

            {rows.length > 0 ? (
              <>
                <MediaImportSummaryFilters
                  activeFilter={previewFilter}
                  counts={{
                    all: stats.all,
                    ready: stats.ready,
                    errors: stats.errors,
                    replacements: stats.replacements,
                  }}
                  onChange={setPreviewFilter}
                />

                <MediaImportPreviewTable
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
                        Що робити, якщо медіа цього типу вже існує?
                      </span>
                      <select
                        value={replacementStrategy}
                        onChange={(event) =>
                          setReplacementStrategy(
                            event.target.value as ExerciseMediaReplacementStrategy,
                          )
                        }
                        className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-black outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 lg:max-w-xl"
                      >
                        <option value="skip">Пропустити існуючі медіа</option>
                        <option value="replace">
                          Замінити після успішного завантаження
                        </option>
                      </select>
                      <span className="mt-2 block text-sm font-semibold leading-6 text-slate-500">
                        Під час заміни новий файл спочатку завантажується та
                        зберігається у вправі. Старий файл видаляється зі Storage
                        лише після успішного оновлення.
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
                        : `Імпортувати ${stats.importable} файлів`}
                    </button>
                  </div>

                  {replacementStrategy === "skip" && stats.replacements > 0 ? (
                    <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                      {stats.replacements} файлів із групи «Заміни» буде
                      пропущено. Оберіть стратегію заміни, щоб імпортувати їх.
                    </p>
                  ) : null}

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
