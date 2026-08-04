import { supabase } from "@/lib/supabase";

export type TrainingNotificationEvent =
  | "published"
  | "updated"
  | "cancelled"
  | "restored";

export type TrainingNotificationContext = {
  previousStartsAt?: string | null;
  previousLocation?: string | null;
  previousTeamName?: string | null;
};

export async function sendTrainingNotification(
  trainingId: string,
  eventType: TrainingNotificationEvent,
  context?: TrainingNotificationContext,
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Сесію адміністратора не знайдено.");
  }

  const response = await fetch("/api/training-notifications/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ trainingId, eventType, context }),
  });

  const result = (await response.json()) as {
    success?: boolean;
    message?: string;
  };

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Push-сповіщення не надіслано.");
  }

  return result;
}
