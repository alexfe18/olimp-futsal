import { supabase } from "@/lib/supabase";

export type PlayerVisibleTraining = {
  id: string;
  title: string;
  starts_at: string;
  location: string;
  status: string;
  is_active: boolean;
  team_id: string | null;
  team_name: string | null;
};

export type PlayerTrainingAttendanceStatus = "yes" | "maybe" | "no";

export type PlayerTrainingAttendanceSummary = {
  trainingId: string;
  yes: number;
  maybe: number;
  no: number;
  total: number;
  myStatus: PlayerTrainingAttendanceStatus | null;
};

type TrainingAttendancePresentationRow = {
  training_id: string;
  player_id: string | null;
  status: string | null;
};

const TRAINING_FIELDS =
  "id,title,starts_at,location,status,is_active,team_id,team_name";

export function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function isPlayerTrainingAttendanceStatus(
  status: string | null | undefined,
): status is PlayerTrainingAttendanceStatus {
  return status === "yes" || status === "maybe" || status === "no";
}

export function createEmptyTrainingAttendanceSummary(
  trainingId: string,
): PlayerTrainingAttendanceSummary {
  return {
    trainingId,
    yes: 0,
    maybe: 0,
    no: 0,
    total: 0,
    myStatus: null,
  };
}

export async function loadPlayerVisibleTrainings(teamId: string) {
  const { data, error } = await supabase
    .from("trainings")
    .select(TRAINING_FIELDS)
    .eq("team_id", teamId)
    .eq("is_active", true)
    .eq("status", "scheduled")
    .order("starts_at", { ascending: true })
    .limit(20);

  if (error) {
    throw error;
  }

  return (data ?? []) as PlayerVisibleTraining[];
}

export async function loadPlayerVisibleTraining(
  teamId: string,
  trainingId: string,
) {
  if (!isValidUuid(trainingId)) {
    return null;
  }

  const { data, error } = await supabase
    .from("trainings")
    .select(TRAINING_FIELDS)
    .eq("id", trainingId)
    .eq("team_id", teamId)
    .eq("is_active", true)
    .eq("status", "scheduled")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as PlayerVisibleTraining | null) ?? null;
}

export async function loadPlayerTrainingAttendancePresentation(
  trainingIds: string[],
  playerId: string | null,
) {
  const uniqueTrainingIds = [...new Set(trainingIds.filter(isValidUuid))];

  const summaries = Object.fromEntries(
    uniqueTrainingIds.map((trainingId) => [
      trainingId,
      createEmptyTrainingAttendanceSummary(trainingId),
    ]),
  ) as Record<string, PlayerTrainingAttendanceSummary>;

  if (uniqueTrainingIds.length === 0) {
    return summaries;
  }

  const { data, error } = await supabase
    .from("training_attendance")
    .select("training_id,player_id,status")
    .in("training_id", uniqueTrainingIds);

  if (error) {
    throw error;
  }

  for (const row of (data ?? []) as TrainingAttendancePresentationRow[]) {
    const summary = summaries[row.training_id];

    if (!summary || !isPlayerTrainingAttendanceStatus(row.status)) {
      continue;
    }

    summary[row.status] += 1;
    summary.total += 1;

    if (playerId && row.player_id === playerId) {
      summary.myStatus = row.status;
    }
  }

  return summaries;
}

export function formatTrainingDate(startsAt: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    timeZone: "Europe/Kyiv",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(startsAt));
}

export function formatTrainingTime(startsAt: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    timeZone: "Europe/Kyiv",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(startsAt));
}
