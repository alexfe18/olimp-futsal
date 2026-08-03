import type { AttendanceStatus, FeedbackState } from "./types";

export function normalizePlayerName(playerName: string) {
  return playerName.trim().toLocaleLowerCase("uk");
}

export function getStatusStorageKey(trainingId: string, playerName: string) {
  return [
    "olimp-training-status",
    trainingId,
    encodeURIComponent(normalizePlayerName(playerName)),
  ].join("-");
}

export function isAttendanceStatus(
  value: string | null,
): value is AttendanceStatus {
  return value === "yes" || value === "maybe" || value === "no";
}

export function getSuccessFeedback(
  status: AttendanceStatus,
  wasUpdated: boolean,
): FeedbackState {
  const title = wasUpdated ? "Відповідь оновлено!" : "Дякуємо!";

  if (status === "yes") {
    return {
      type: "success",
      title,
      description: "До зустрічі на тренуванні! 💙💛",
    };
  }

  if (status === "maybe") {
    return {
      type: "success",
      title,
      description: "Ваш вибір збережено. Змініть відповідь, коли визначитеся.",
    };
  }

  return {
    type: "success",
    title,
    description: "Дякуємо, що завчасно попередили.",
  };
}

export function formatTrainingDate(isoDate: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Kyiv",
  }).format(new Date(isoDate));
}

export function formatTrainingTime(isoDate: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Kyiv",
  }).format(new Date(isoDate));
}

export function formatAttendanceUpdate(isoDate: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Kyiv",
  }).format(new Date(isoDate));
}
