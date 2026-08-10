import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { sendPushMessage } from "@/lib/server/push-sender";

type NotificationEventType =
  | "published"
  | "updated"
  | "cancelled"
  | "restored";

type NotificationContext = {
  previousStartsAt?: string | null;
  previousLocation?: string | null;
  previousTeamName?: string | null;
};

type RequestPayload = {
  trainingId?: string;
  eventType?: NotificationEventType;
  context?: NotificationContext;
};

type TrainingRow = {
  id: string;
  title: string;
  starts_at: string;
  location: string;
  team_name: string | null;
  status: "scheduled" | "cancelled" | "completed";
  cancellation_reason: string | null;
};

const supportedEventTypes = new Set<NotificationEventType>([
  "published",
  "updated",
  "cancelled",
  "restored",
]);

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Kyiv",
  }).format(new Date(value));
}

function createMessage(
  training: TrainingRow,
  eventType: NotificationEventType,
  context?: NotificationContext,
) {
  const dateTime = formatDateTime(training.starts_at);
  const teamSuffix = training.team_name ? ` · ${training.team_name}` : "";

  if (eventType === "cancelled") {
    return {
      title: "Тренування скасовано",
      body: training.cancellation_reason
        ? `${training.title}${teamSuffix}. Причина: ${training.cancellation_reason}`
        : `${training.title}${teamSuffix} скасовано.`,
    };
  }

  if (eventType === "updated") {
    const previousDateTime = context?.previousStartsAt
      ? formatDateTime(context.previousStartsAt)
      : null;
    const dateChanged =
      Boolean(previousDateTime) && previousDateTime !== dateTime;
    const locationChanged =
      Boolean(context?.previousLocation) &&
      context?.previousLocation !== training.location;
    const teamChanged =
      Boolean(context?.previousTeamName) &&
      context?.previousTeamName !== training.team_name;

    if (dateChanged) {
      return {
        title: "Тренування перенесено",
        body: `${training.title}${teamSuffix}: було ${previousDateTime}, тепер ${dateTime}. Місце: ${training.location}.`,
      };
    }

    if (locationChanged) {
      return {
        title: "Змінено місце тренування",
        body: `${training.title}${teamSuffix}: нове місце — ${training.location}. ${dateTime}.`,
      };
    }

    if (teamChanged) {
      return {
        title: "Змінено команду тренування",
        body: `${training.title}: ${training.team_name || "команду не вказано"}. ${dateTime}, ${training.location}.`,
      };
    }

    return {
      title: "Зміни у тренуванні",
      body: `${training.title}${teamSuffix}: ${dateTime}, ${training.location}.`,
    };
  }

  if (eventType === "restored") {
    return {
      title: "Тренування відновлено",
      body: `${training.title}${teamSuffix}: ${dateTime}, ${training.location}.`,
    };
  }

  return {
    title: "Нове тренування",
    body: `${training.title}${teamSuffix}: ${dateTime}, ${training.location}.`,
  };
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, message: "Сервер Supabase не налаштований." },
        { status: 500 },
      );
    }

    const authorization = request.headers.get("authorization");
    const accessToken = authorization?.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "Потрібна авторизація адміністратора." },
        { status: 401 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: userData, error: userError } =
      await supabase.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return NextResponse.json(
        { success: false, message: "Сесію адміністратора не підтверджено." },
        { status: 401 },
      );
    }

    const payload = (await request.json()) as RequestPayload;
    const trainingId = payload.trainingId?.trim();
    const eventType = payload.eventType;

    if (!trainingId || !eventType || !supportedEventTypes.has(eventType)) {
      return NextResponse.json(
        { success: false, message: "Не вказано тренування або тип події." },
        { status: 400 },
      );
    }

    const { data: trainingData, error: trainingError } = await supabase
      .from("trainings")
      .select(
        "id, title, starts_at, location, team_name, status, cancellation_reason",
      )
      .eq("id", trainingId)
      .single();

    if (trainingError || !trainingData) {
      return NextResponse.json(
        { success: false, message: "Пов’язане тренування не знайдено." },
        { status: 404 },
      );
    }

    const training = trainingData as TrainingRow;
    const notification = createMessage(
      training,
      eventType,
      payload.context,
    );
    const result = await sendPushMessage({
      ...notification,
      url: "/training",
      tag: `olimp-training-${training.id}`,
    });

    const { data: eventData } = await supabase
      .from("training_plan_events")
      .select("id")
      .eq("training_id", training.id)
      .eq("event_type", eventType)
      .is("processed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (eventData?.id) {
      await supabase
        .from("training_plan_events")
        .update({ processed_at: new Date().toISOString() })
        .eq("id", eventData.id);
    }

    if (result.suppressed) {
      console.info("[push] TRAINING NOTIFICATION SUPPRESSED", {
        trainingId: training.id,
        eventType,
        runtime: result.runtime,
        mode: result.mode,
        reason: result.reason,
      });
    }

    return NextResponse.json({
      success: true,
      ...result,
      message: result.suppressed
        ? `Push не надіслано (${result.reason}).`
        : `Надіслано сповіщень: ${result.sent}.`,
    });
  } catch (error) {
    console.error("Training notification error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Не вдалося надіслати Push-сповіщення.",
      },
      { status: 500 },
    );
  }
}
