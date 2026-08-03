"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import ExerciseForm from "../../components/form/ExerciseForm";
import {
  ExerciseLoaderError,
  loadExerciseForEdit,
  mapExerciseToFormInitialData,
} from "../../components/form/data";
import type { ExerciseFormInitialData } from "../../components/form/types/exercise-form";
import { getPublicMediaUrl } from "../utils";

type EditPageState =
  | { status: "loading" }
  | { status: "ready"; initialData: ExerciseFormInitialData }
  | { status: "not-found" }
  | { status: "error"; message: string };

export default function EditExercisePage() {
  const params = useParams<{ id: string }>();
  const exerciseId = params.id;
  const [pageState, setPageState] = useState<EditPageState>({
    status: "loading",
  });

  useEffect(() => {
    let isCancelled = false;

    async function loadEditData() {
      try {
        const exercise = await loadExerciseForEdit(exerciseId);

        if (isCancelled) return;

        if (!exercise) {
          setPageState({ status: "not-found" });
          return;
        }

        const initialData = mapExerciseToFormInitialData(exercise, {
          coverImageUrl: getPublicMediaUrl(exercise.cover_image_path),
          diagramImageUrl: getPublicMediaUrl(exercise.diagram_image_path),
        });

        setPageState({ status: "ready", initialData });
      } catch (error) {
        if (isCancelled) return;

        console.error("Exercise edit loading error:", error);

        setPageState({
          status: "error",
          message:
            error instanceof ExerciseLoaderError
              ? error.message
              : "Не вдалося підготувати вправу до редагування.",
        });
      }
    }

    void loadEditData();

    return () => {
      isCancelled = true;
    };
  }, [exerciseId]);

  if (pageState.status === "loading") {
    return <EditExerciseLoadingState />;
  }

  if (pageState.status === "not-found") {
    return (
      <EditExerciseMessageState
        icon="🏃"
        title="Вправу не знайдено"
        description="Можливо, вправу було видалено або у вас немає доступу до її редагування."
      />
    );
  }

  if (pageState.status === "error") {
    return (
      <EditExerciseMessageState
        icon="⚠️"
        title="Не вдалося відкрити редагування"
        description={pageState.message}
      />
    );
  }

  return <ExerciseForm mode="edit" initialData={pageState.initialData} />;
}

function EditExerciseLoadingState() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="h-80 animate-pulse rounded-[2rem] bg-slate-950" />
        <div className="mt-8 grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <div className="h-96 animate-pulse rounded-[2rem] bg-white" />
            <div className="h-80 animate-pulse rounded-[2rem] bg-white" />
          </div>
          <div className="h-[520px] animate-pulse rounded-[2rem] bg-white" />
        </div>
      </div>
    </main>
  );
}

function EditExerciseMessageState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6">
      <section className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
        <div className="text-5xl" aria-hidden="true">
          {icon}
        </div>
        <h1 className="mt-5 text-3xl font-black text-slate-950">{title}</h1>
        <p className="mx-auto mt-3 max-w-xl font-semibold leading-7 text-slate-500">
          {description}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/admin/coach/exercises"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-sky-400 px-6 font-black text-slate-950 transition hover:bg-sky-300"
          >
            До бібліотеки вправ
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Спробувати ще раз
          </button>
        </div>
      </section>
    </main>
  );
}
