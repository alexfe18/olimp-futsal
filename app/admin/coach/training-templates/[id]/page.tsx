"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import TrainingPlanBuilder from "../../training-plans/components/TrainingPlanBuilder";
import { loadTrainingTemplate } from "../../training-plans/components/training-plan-service";
import type {
  TrainingPlanDraft,
  TrainingTemplateStatus,
} from "../../training-plans/components/types";

type LoadedTemplate = {
  draft: TrainingPlanDraft;
  templateStatus: TrainingTemplateStatus;
  sourcePlanId: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function TrainingTemplateEditorPage() {
  const params = useParams<{ id: string }>();
  const templateId = params.id;

  const [loadedTemplate, setLoadedTemplate] =
    useState<LoadedTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPage = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await loadTrainingTemplate(templateId);
      setLoadedTemplate(data);
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      const normalized = text.toLocaleLowerCase("en-US");
      setErrorMessage(
        normalized.includes("training_templates") ||
          normalized.includes("save_training_template_draft")
          ? "Не вдалося відкрити шаблон. Виконайте SQL-міграцію Sprint 05.1."
          : `Не вдалося відкрити шаблон тренування. ${text}`,
      );
      setLoadedTemplate(null);
    } finally {
      setIsLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    // Initial client-side fetch for the requested template.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPage();
  }, [loadPage]);

  if (isLoading) {
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

  if (errorMessage || !loadedTemplate) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-rose-200 bg-white p-8 text-center shadow-sm">
          <span className="text-5xl" aria-hidden="true">
            ⚠️
          </span>
          <h1 className="mt-5 text-3xl font-black text-slate-950">
            Шаблон не завантажено
          </h1>
          <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-600">
            {errorMessage ?? "Шаблон тренування не знайдено."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => void loadPage()}
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
      key={`${loadedTemplate.draft.id}-${loadedTemplate.updatedAt}`}
      mode="edit"
      entity="template"
      initialDraft={loadedTemplate.draft}
      initialTemplateStatus={loadedTemplate.templateStatus}
      sourcePlanId={loadedTemplate.sourcePlanId}
      sourceLabel={
        loadedTemplate.sourcePlanId
          ? "Шаблон створено з плану тренування"
          : null
      }
      createdAt={loadedTemplate.createdAt}
      updatedAt={loadedTemplate.updatedAt}
    />
  );
}
