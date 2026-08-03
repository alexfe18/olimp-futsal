"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

import ContentCard from "../components/ui/ContentCard";
import ExerciseActions from "./components/ExerciseActions";
import ExerciseDiagram from "./components/ExerciseDiagram";
import ExerciseHero from "./components/ExerciseHero";
import ExerciseSidebar from "./components/ExerciseSidebar";
import ExerciseVideo from "./components/ExerciseVideo";
import type { Exercise, ExerciseStatus } from "./types";
import { getPublicMediaUrl, getStoragePaths, goalLabels } from "./utils";

export default function ExerciseDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const exerciseId = params.id;

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const loadExercise = useCallback(async () => {
    setIsLoading(true);
    setMessage("");
    setMessageType("");

    const { data, error } = await supabase
      .from("exercises")
      .select(
        `
        id,
        code,
        title,
        description,
        organization,
        coaching_points,
        common_mistakes,
        progression,
        regression,
        load_control,
        equipment,
        primary_goal,
        category,
        exercise_type,
        player_format,
        min_players,
        max_players,
        duration_minutes,
        difficulty,
        intensity,
        field_size,
        library_tier,
        source,
        is_system,
        age_groups,
        cover_image_path,
        diagram_image_path,
        video_path,
        external_video_url,
        status,
        created_at,
        updated_at,
        exercise_goals(id, goal),
        exercise_tags(id, tag)
      `,
      )
      .eq("id", exerciseId)
      .single();

    if (error) {
      console.error("Exercise loading error:", error);
      setMessage("Не вдалося завантажити вправу.");
      setMessageType("error");
      setExercise(null);
    } else {
      setExercise(data as Exercise);
    }

    setIsLoading(false);
  }, [exerciseId]);

  useEffect(() => {
    // Data fetching is intentionally initiated when the route ID changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadExercise();
  }, [loadExercise]);

  const coverUrl = useMemo(
    () => getPublicMediaUrl(exercise?.cover_image_path ?? null),
    [exercise?.cover_image_path],
  );

  const diagramUrl = useMemo(
    () => getPublicMediaUrl(exercise?.diagram_image_path ?? null),
    [exercise?.diagram_image_path],
  );

  const videoUrl = useMemo(
    () => getPublicMediaUrl(exercise?.video_path ?? null),
    [exercise?.video_path],
  );

  async function toggleArchive() {
    if (!exercise) return;

    const nextStatus: ExerciseStatus =
      exercise.status === "archived" ? "draft" : "archived";

    const confirmed = window.confirm(
      nextStatus === "archived"
        ? `Перемістити вправу «${exercise.title}» до архіву?`
        : `Повернути вправу «${exercise.title}» з архіву?`,
    );

    if (!confirmed) return;

    setIsProcessing(true);
    setMessage("");

    const { error } = await supabase
      .from("exercises")
      .update({ status: nextStatus })
      .eq("id", exercise.id);

    if (error) {
      console.error("Exercise status error:", error);
      setMessage("Не вдалося змінити статус вправи.");
      setMessageType("error");
    } else {
      setMessage(
        nextStatus === "archived"
          ? "Вправу переміщено до архіву."
          : "Вправу повернено з архіву.",
      );
      setMessageType("success");
      await loadExercise();
    }

    setIsProcessing(false);
  }

  async function deleteExercise() {
    if (!exercise) return;

    const confirmed = window.confirm(
      `Назавжди видалити вправу «${exercise.title}»?\n\nЦю дію неможливо скасувати.`,
    );

    if (!confirmed) return;

    setIsProcessing(true);
    setMessage("");

    const mediaPaths = getStoragePaths(exercise);

    const { error } = await supabase
      .from("exercises")
      .delete()
      .eq("id", exercise.id);

    if (error) {
      console.error("Exercise deleting error:", error);
      setMessage(
        error.code === "23503"
          ? "Вправа вже використовується у тренувальному плані. Перемістіть її до архіву."
          : "Не вдалося видалити вправу.",
      );
      setMessageType("error");
      setIsProcessing(false);
      return;
    }

    if (mediaPaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("exercise-media")
        .remove(mediaPaths);

      if (storageError) {
        console.error("Exercise media deleting error:", storageError);
      }
    }

    router.push("/admin/coach/exercises");
    router.refresh();
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="h-72 animate-pulse rounded-[2rem] bg-slate-950" />
          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="h-[520px] animate-pulse rounded-[2rem] bg-white" />
            <div className="h-80 animate-pulse rounded-[2rem] bg-white" />
          </div>
        </div>
      </main>
    );
  }

  if (!exercise) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6">
        <section className="mx-auto max-w-3xl rounded-[2rem] bg-white p-10 text-center shadow-sm">
          <div className="text-5xl">🏃</div>
          <h1 className="mt-5 text-3xl font-black">Вправу не знайдено</h1>
          <p className="mt-3 text-slate-500">
            Можливо, її було видалено або у вас немає доступу.
          </p>
          <Link
            href="/admin/coach/exercises"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-sky-400 px-6 font-black text-slate-950"
          >
            До бібліотеки
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <ExerciseActions
          exercise={exercise}
          isProcessing={isProcessing}
          onArchive={() => void toggleArchive()}
          onDelete={() => void deleteExercise()}
        />

        {message ? (
          <p
            role="status"
            className={`mt-5 rounded-2xl border px-5 py-4 font-bold ${
              messageType === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {message}
          </p>
        ) : null}

        <ExerciseHero exercise={exercise} coverUrl={coverUrl} />

        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-8">
            <OverviewSectionHeader
              eyebrow="Виконання вправи"
              title="Організація та робота тренера"
              description="Основна інформація, необхідна для підготовки та проведення вправи."
            />

            <div className="space-y-6">
              <ContentCard
                icon="🎯"
                eyebrow="Напрямки роботи"
                title="Цілі вправи"
                isEmpty={exercise.exercise_goals.length === 0}
                emptyMessage="Цілі для цієї вправи ще не вказано."
                contentClassName="whitespace-normal"
              >
                <div className="flex flex-wrap gap-2">
                  {exercise.exercise_goals.map((goal) => (
                    <span
                      key={goal.id}
                      className="rounded-full bg-sky-50 px-4 py-2 text-sm font-black text-sky-700"
                    >
                      {goalLabels[goal.goal] ?? goal.goal}
                    </span>
                  ))}
                </div>
              </ContentCard>

              <ContentCard
                icon="📍"
                eyebrow="Проведення"
                title="Організація"
                isEmpty={!exercise.organization}
                emptyMessage="Організацію вправи ще не описано."
              >
                {exercise.organization}
              </ContentCard>

              <div className="grid gap-6 lg:grid-cols-2">
                <ContentCard
                  icon="🥅"
                  eyebrow="Інвентар"
                  title="Що знадобиться"
                  isEmpty={!exercise.equipment}
                  emptyMessage="Інвентар для цієї вправи ще не вказано."
                >
                  {exercise.equipment}
                </ContentCard>

                <ContentCard
                  icon="🎓"
                  eyebrow="Робота тренера"
                  title="Підказки"
                  isEmpty={!exercise.coaching_points}
                  emptyMessage="Підказки тренера ще не додано."
                >
                  {exercise.coaching_points}
                </ContentCard>
              </div>

              <ContentCard
                icon="⚠️"
                eyebrow="Контроль"
                title="Типові помилки"
                isEmpty={!exercise.common_mistakes}
                emptyMessage="Типові помилки для цієї вправи ще не вказано."
              >
                {exercise.common_mistakes}
              </ContentCard>
            </div>

            <OverviewSectionHeader
              eyebrow="Медіа"
              title="Схема та відео"
              description="Візуальні матеріали для швидкого розуміння структури вправи."
            />

            <div className="space-y-6">
              <ExerciseDiagram title={exercise.title} diagramUrl={diagramUrl} />

              <ExerciseVideo
                videoUrl={videoUrl}
                externalVideoUrl={exercise.external_video_url}
              />
            </div>

            <OverviewSectionHeader
              eyebrow="Методика"
              title="Адаптація та контроль"
              description="Варіанти зміни складності та рекомендації щодо навантаження."
            />

            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <ContentCard
                  icon="📈"
                  eyebrow="Ускладнення"
                  title="Прогресія"
                  isEmpty={!exercise.progression}
                  emptyMessage="Варіант ускладнення вправи ще не додано."
                >
                  {exercise.progression}
                </ContentCard>

                <ContentCard
                  icon="📉"
                  eyebrow="Спрощення"
                  title="Регресія"
                  isEmpty={!exercise.regression}
                  emptyMessage="Варіант спрощення вправи ще не додано."
                >
                  {exercise.regression}
                </ContentCard>
              </div>

              <ContentCard
                icon="📊"
                eyebrow="Навантаження"
                title="Контроль навантаження"
                isEmpty={!exercise.load_control}
                emptyMessage="Рекомендації щодо контролю навантаження ще не додано."
              >
                {exercise.load_control}
              </ContentCard>
            </div>
          </div>

          <ExerciseSidebar exercise={exercise} />
        </div>
      </div>
    </main>
  );
}

function OverviewSectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="border-b border-slate-200 pb-4">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-2xl font-black text-slate-950">{title}</h2>

      <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
        {description}
      </p>
    </section>
  );
}
