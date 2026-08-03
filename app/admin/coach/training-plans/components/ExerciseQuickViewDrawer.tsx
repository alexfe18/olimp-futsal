"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { ExerciseRow } from "@/app/admin/coach/exercises/components/types";
import {
  categoryLabels,
  difficultyLabels,
  getPlayersLabel,
  getPublicMediaUrl,
  goalLabels,
  libraryTierLabels,
  playerFormatLabels,
  typeLabels,
} from "@/app/admin/coach/exercises/[id]/utils";

import { loadExerciseQuickView } from "./training-plan-service";
import type { ExerciseSummary } from "./types";

type ExerciseQuickViewTarget = Pick<
  ExerciseSummary,
  "id" | "title" | "code" | "category"
>;

type Props = {
  exercise: ExerciseQuickViewTarget;
  onClose: () => void;
};

const intensityLabels: Record<string, string> = {
  low: "Низька",
  medium: "Середня",
  high: "Висока",
  variable: "Змінна",
};

const fieldSizeLabels: Record<string, string> = {
  small: "Мала зона",
  medium: "Середня зона",
  large: "Велика зона",
  full_court: "Весь майданчик",
  custom: "Індивідуально",
};

export default function ExerciseQuickViewDrawer({ exercise, onClose }: Props) {
  const [details, setDetails] = useState<ExerciseRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDetails = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await loadExerciseQuickView(exercise.id);
      setDetails(data);
    } catch (error) {
      setDetails(null);
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  }, [exercise.id]);

  useEffect(() => {
    // Quick View fetches the full exercise only when the drawer is opened.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDetails();
  }, [loadDetails]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const coverUrl = useMemo(
    () => getPublicMediaUrl(details?.cover_image_path ?? null),
    [details?.cover_image_path],
  );
  const diagramUrl = useMemo(
    () => getPublicMediaUrl(details?.diagram_image_path ?? null),
    [details?.diagram_image_path],
  );
  const videoUrl = useMemo(
    () => getPublicMediaUrl(details?.video_path ?? null),
    [details?.video_path],
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-end bg-slate-950/60 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-quick-view-title"
        className="flex h-full w-full max-w-3xl flex-col overflow-hidden bg-slate-100 shadow-2xl"
      >
        <header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
                Швидкий перегляд вправи
              </p>
              <h2
                id="exercise-quick-view-title"
                className="mt-2 break-words text-2xl font-black leading-tight text-slate-950 sm:text-3xl"
              >
                {exercise.title}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge>{exercise.code || "Без коду"}</Badge>
                <Badge tone="sky">
                  {categoryLabels[exercise.category] ?? exercise.category}
                </Badge>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Закрити швидкий перегляд"
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-2xl font-black text-slate-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
            >
              ×
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/admin/coach/exercises/${exercise.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-sky-500 hover:text-slate-950"
            >
              Відкрити повну сторінку ↗
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-black text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
            >
              Повернутися до плану
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          {isLoading ? <QuickViewSkeleton /> : null}

          {!isLoading && errorMessage ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
              <p className="font-black">Не вдалося завантажити вправу.</p>
              <p className="mt-2 text-sm font-semibold leading-6">
                {errorMessage}
              </p>
              <button
                type="button"
                onClick={() => void loadDetails()}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-rose-700 px-5 text-sm font-black text-white transition hover:bg-rose-600"
              >
                Повторити
              </button>
            </div>
          ) : null}

          {!isLoading && details ? (
            <div className="space-y-5">
              <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-lg">
                {coverUrl ? (
                  <Image
                    src={coverUrl}
                    alt={details.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 48rem"
                    className="object-cover opacity-40"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/95 to-slate-950/60" />
                <div className="relative p-6 sm:p-8">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">
                    {categoryLabels[details.category] ?? details.category}
                  </p>
                  <h3 className="mt-3 text-3xl font-black leading-tight">
                    {details.title}
                  </h3>
                  <p className="mt-4 whitespace-pre-line font-semibold leading-7 text-slate-300">
                    {details.description || "Короткий опис ще не додано."}
                  </p>
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Metric label="Тривалість" value={`${details.duration_minutes} хв`} />
                <Metric
                  label="Гравці"
                  value={getPlayersLabel(details.min_players, details.max_players)}
                />
                <Metric
                  label="Складність"
                  value={difficultyLabels[details.difficulty]}
                />
                <Metric
                  label="Формат"
                  value={
                    details.player_format
                      ? playerFormatLabels[details.player_format] ??
                        details.player_format
                      : "Не вказано"
                  }
                />
                <Metric
                  label="Інтенсивність"
                  value={
                    details.intensity
                      ? intensityLabels[details.intensity] ?? details.intensity
                      : "Не вказано"
                  }
                />
                <Metric
                  label="Майданчик"
                  value={
                    details.field_size
                      ? fieldSizeLabels[details.field_size] ?? details.field_size
                      : "Не вказано"
                  }
                />
                <Metric
                  label="Тип вправи"
                  value={
                    typeLabels[details.exercise_type] ?? details.exercise_type
                  }
                />
                <Metric
                  label="Рівень бібліотеки"
                  value={
                    libraryTierLabels[details.library_tier] ??
                    details.library_tier
                  }
                />
              </section>

              <ChipSection
                title="Вікові групи"
                values={details.age_groups}
                emptyText="Вікові групи не вказано."
              />

              <ChipSection
                title="Цілі"
                values={uniqueValues([
                  details.primary_goal,
                  ...details.exercise_goals.map((item) => item.goal),
                ]).map((goal) => goalLabels[goal] ?? goal)}
                emptyText="Цілі ще не додано."
              />

              <ChipSection
                title="Теги"
                values={details.exercise_tags.map((item) => `#${item.tag}`)}
                emptyText="Теги ще не додано."
              />

              <TextSection title="Організація" value={details.organization} />
              <TextSection title="Інвентар" value={details.equipment} />
              <TextSection
                title="Тренерські акценти"
                value={details.coaching_points}
              />
              <TextSection
                title="Типові помилки"
                value={details.common_mistakes}
              />

              <div className="grid gap-5 lg:grid-cols-2">
                <TextSection title="Ускладнення" value={details.progression} />
                <TextSection title="Спрощення" value={details.regression} />
              </div>

              <TextSection
                title="Альтернативний варіант"
                value={details.alternative}
              />
              <TextSection
                title="Контроль навантаження"
                value={details.load_control}
              />

              <MediaSection
                title="Тактична схема"
                emptyText="Схему для цієї вправи ще не додано."
              >
                {diagramUrl ? (
                  <div className="relative h-[24rem] overflow-hidden rounded-2xl bg-slate-100">
                    <Image
                      src={diagramUrl}
                      alt={`Схема: ${details.title}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 48rem"
                      className="object-contain"
                    />
                  </div>
                ) : null}
              </MediaSection>

              <MediaSection
                title="Відео"
                emptyText="Відео для цієї вправи ще не додано."
              >
                {videoUrl ? (
                  <video
                    src={videoUrl}
                    controls
                    preload="metadata"
                    className="w-full rounded-2xl bg-black"
                  />
                ) : null}
                {details.external_video_url ? (
                  <a
                    href={details.external_video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-sky-500 hover:text-slate-950"
                  >
                    Відкрити зовнішнє відео ↗
                  </a>
                ) : null}
              </MediaSection>

              <section className="rounded-3xl border border-sky-200 bg-sky-50 p-5">
                <p className="text-sm font-semibold leading-6 text-sky-950">
                  У конструкторі змінюються лише тривалість, порядок і нотатки
                  до цієї вправи. Основний опис та методичні поля залишаються в
                  Бібліотеці вправ.
                </p>
              </section>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]),
  );
}

function Badge({
  children,
  tone = "dark",
}: {
  children: React.ReactNode;
  tone?: "dark" | "sky";
}) {
  return (
    <span
      className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs font-black ${
        tone === "sky"
          ? "bg-sky-100 text-sky-700"
          : "bg-slate-950 text-white"
      }`}
    >
      {children}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words font-black text-slate-950">{value}</p>
    </div>
  );
}

function ChipSection({
  title,
  values,
  emptyText,
}: {
  title: string;
  values: string[];
  emptyText: string;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-slate-950">{title}</h3>
      {values.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {values.map((value) => (
            <span
              key={value}
              className="inline-flex min-h-8 items-center rounded-full bg-sky-50 px-3 text-xs font-black text-sky-700 ring-1 ring-sky-100"
            >
              {value}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold text-slate-400">{emptyText}</p>
      )}
    </section>
  );
}

function TextSection({
  title,
  value,
}: {
  title: string;
  value: string | null;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-slate-950">{title}</h3>
      <p
        className={`mt-3 whitespace-pre-line text-sm font-semibold leading-7 ${
          value ? "text-slate-600" : "text-slate-400"
        }`}
      >
        {value || "Інформацію ще не додано."}
      </p>
    </section>
  );
}

function MediaSection({
  title,
  emptyText,
  children,
}: {
  title: string;
  emptyText: string;
  children: React.ReactNode;
}) {
  const hasContent = Boolean(
    Array.isArray(children)
      ? children.some(Boolean)
      : children,
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-slate-950">{title}</h3>
      <div className="mt-4">
        {hasContent ? (
          children
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-400">
            {emptyText}
          </div>
        )}
      </div>
    </section>
  );
}

function QuickViewSkeleton() {
  return (
    <div className="space-y-5" aria-label="Завантаження вправи">
      <div className="h-64 animate-pulse rounded-[2rem] bg-slate-200" />
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-2xl bg-slate-200"
          />
        ))}
      </div>
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="h-36 animate-pulse rounded-3xl bg-slate-200"
        />
      ))}
    </div>
  );
}
