"use client";

import TrainingPlanBuilder from "../../training-plans/components/TrainingPlanBuilder";
import type { TrainingPlanDraft } from "../../training-plans/components/types";

const initialDraft: TrainingPlanDraft = {
  id: null,
  title: "",
  sessionDate: "",
  sessionTime: "",
  location: "",
  teamName: "Олімп Футзал",
  ageGroup: "",
  objective: "",
  notes: "",
  intensity: "medium",
  status: "draft",
  trainingId: null,
  publishedAt: null,
  unpublishedAt: null,
  cancelledAt: null,
  cancellationReason: "",
  blocks: [],
};

export default function NewTrainingTemplatePage() {
  return (
    <TrainingPlanBuilder
      mode="create"
      entity="template"
      initialDraft={initialDraft}
      initialTemplateStatus="active"
    />
  );
}
