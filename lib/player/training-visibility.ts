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

const TRAINING_FIELDS =
  "id,title,starts_at,location,status,is_active,team_id,team_name";

export function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
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
