"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import TrainingPlanBuilder from "../components/TrainingPlanBuilder";
import { createPlanDraftFromTemplate } from "../components/training-plan-service";
import type { TrainingPlanDraft } from "../components/types";

const initialDraft: TrainingPlanDraft = {
  id: null,
  title: "",
  sessionDate: "",
  teamName: "Олімп Футзал",
  ageGroup: "",
  objective: "",
  notes: "",
  intensity: "medium",
  status: "draft",
  blocks: [],
};

export default function NewTrainingPlanPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <NewTrainingPlanContent />
    </Suspense>
  );
}

function NewTrainingPlanContent() {
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template");

  const [draft, setDraft] = useState<TrainingPlanDraft | null>(
    templateId ? null : initialDraft,
  );
  const [templateTitle, setTemplateTitle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(templateId));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadTemplate = useCallback(async () => {
    if (!templateId) {
      setDraft(initialDraft);
      setTemplateTitle(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await createPlanDraftFromTemplate(templateId);
      setDraft(data.draft);
      setTemplateTitle(data.templateTitle);
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      const normalized = text.toLocaleLowerCase("en-US");
      setErrorMessage(
        normalized.includes("training_templates")
          ? "Не вдалося завантажити шаблон. Виконайте SQL-міграцію Sprint 05.1."
          : `Не вдалося створити план із шаблону. ${text}`,
      );
      setDraft(null);
      setTemplateTitle(null);
    } finally {
      setIsLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    // Load and clone template data into an independent unsaved plan draft.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTemplate();
  }, [loadTemplate]);

  if (isLoading) return <LoadingState />;

  if (errorMessage || !draft) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-rose-200 bg-white p-8 text-center shadow-sm">
          <span className="text-5xl" aria-hidden="true">
            ⚠️
          </span>
          <h1 className="mt-5 text-3xl font-black text-slate-950">
            План не створено
          </h1>
          <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-600">
            {errorMessage ?? "Шаблон тренування не знайдено."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => void loadTemplate()}
              className="rounded-full bg-sky-400 px-6 py-3 font-black text-slate-950 transition hover:bg-sky-300"
            >
              Повторити
            </button>
            <Link
              href="/admin/coach/training-templates"
              className="rounded-full border border-slate-300 px-6 py-3 font-black text-slate-700 transition hover:bg-slate-50"
            >
              До шаблонів
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <TrainingPlanBuilder
      key={templateId ?? "empty-plan"}
      mode="create"
      initialDraft={draft}
      sourceLabel={
        templateTitle ? `Створено з шаблону: ${templateTitle}` : null
      }
    />
  );
}

function LoadingState() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[96rem]">
        <div className="h-56 animate-pulse rounded-[2rem] bg-slate-950" />
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(24rem,0.65fr)]">
          <div className="space-y-6">
            <div className="h-96 animate-pulse rounded-[2rem] bg-white" />
            <div className="h-[32rem] animate-pulse rounded-[2rem] bg-white" />
          </div>
          <div className="h-[40rem] animate-pulse rounded-[2rem] bg-white" />
        </div>
      </div>
    </main>
  );
}
