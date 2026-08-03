"use client";

import TrainingPlanBuilder from "../../training-plans/components/TrainingPlanBuilder";
import type { TrainingPlanDraft } from "../../training-plans/components/types";

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
