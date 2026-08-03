"use client";

import TrainingPlanBuilder from "../components/TrainingPlanBuilder";
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
  return <TrainingPlanBuilder mode="create" initialDraft={initialDraft} />;
}
