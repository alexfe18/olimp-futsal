import type { FeedbackState, StatusOption } from "./types";

export const PLAYER_NAME_STORAGE_KEY = "olimp-player-name";

export const emptyFeedback: FeedbackState = {
  type: "",
  title: "",
  description: "",
};

export const statusOptions: StatusOption[] = [
  {
    value: "yes",
    label: "Буду",
    groupLabel: "Будуть",
    icon: "✓",
  },
  {
    value: "maybe",
    label: "Під питанням",
    groupLabel: "Під питанням",
    icon: "?",
  },
  {
    value: "no",
    label: "Не буду",
    groupLabel: "Не будуть",
    icon: "×",
  },
];
