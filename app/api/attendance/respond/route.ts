import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getAttendanceWriteDecision } from "@/lib/server/attendance-environment";

type AttendanceStatus = "yes" | "maybe" | "no";

type AttendanceRequest = {
  trainingId?: string;
  status?: AttendanceStatus;
};

type ActiveTraining = {
  id: string;
  team_id: string | null;
  is_active: boolean;
  status: string;
};

type ActiveMembership = {
  player_id: string | null;
  team_id: string;
};

const VALID_STATUSES = new Set<AttendanceStatus>(["yes", "maybe", "no"]);

function normalizeText(value: string | undefined) {
  return value?.trim() ?? "";
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Сервер відвідуваності не налаштований.",
        },
        { status: 500 },
      );
    }

    const body = (await request.json()) as AttendanceRequest;
    const trainingId = normalizeText(body.trainingId);
    const status = body.status;

    if (!trainingId || !status || !VALID_STATUSES.has(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Не вказано тренування або коректну відповідь.",
        },
        { status: 400 },
      );
    }

    const authorization = request.headers.get("authorization");
    const accessToken = authorization?.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          login_required: true,
          message: "Увійдіть як гравець команди, щоб зберегти відповідь.",
        },
        { status: 401 },
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: userData, error: userError } =
      await admin.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return NextResponse.json(
        {
          success: false,
          login_required: true,
          message: "Сесія завершилася. Увійдіть ще раз.",
        },
        { status: 401 },
      );
    }

    const { data: trainingData, error: trainingError } = await admin
      .from("trainings")
      .select("id, team_id, is_active, status")
      .eq("id", trainingId)
      .maybeSingle();

    if (trainingError) {
      console.error("Attendance training validation error:", trainingError);

      return NextResponse.json(
        {
          success: false,
          message: "Не вдалося перевірити тренування.",
        },
        { status: 500 },
      );
    }

    const training = trainingData as ActiveTraining | null;

    if (
      !training ||
      !training.team_id ||
      !training.is_active ||
      training.status !== "scheduled"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Відповіді для цього тренування зараз недоступні.",
        },
        { status: 409 },
      );
    }

    const { data: memberships, error: membershipError } = await admin
      .from("team_memberships")
      .select("player_id, team_id")
      .eq("profile_id", userData.user.id)
      .eq("team_id", training.team_id)
      .eq("status", "active")
      .is("archived_at", null)
      .not("player_id", "is", null)
      .limit(2);

    if (membershipError) {
      console.error(
        "Attendance player membership validation error:",
        membershipError,
      );

      return NextResponse.json(
        {
          success: false,
          message: "Не вдалося перевірити профіль гравця.",
        },
        { status: 500 },
      );
    }

    const membership =
      ((memberships ?? [])[0] as ActiveMembership | undefined) ?? null;

    if (!membership?.player_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Активне членство у команді потрібне для голосування.",
        },
        { status: 403 },
      );
    }

    const { data: player, error: playerError } = await admin
      .from("players")
      .select("id, is_active")
      .eq("id", membership.player_id)
      .eq("is_active", true)
      .maybeSingle();

    if (playerError || !player) {
      return NextResponse.json(
        {
          success: false,
          message: "Активного гравця не знайдено.",
        },
        { status: 404 },
      );
    }

    const decision = getAttendanceWriteDecision({
      playerId: membership.player_id,
      trainingId,
      authenticated: true,
    });

    if (!decision.allowed) {
      console.info("[attendance] SUPPRESSED", {
        runtime: decision.runtime,
        mode: decision.configuredMode,
        reason: decision.reason,
        trainingId,
        playerId: membership.player_id,
        authenticated: true,
      });

      return NextResponse.json({
        success: true,
        suppressed: true,
        saved: false,
        status,
        runtime: decision.runtime,
        mode: decision.configuredMode,
        reason: decision.reason,
        message:
          "Локальний safe mode: відповідь перевірена, але не записана в базу.",
      });
    }

    const { data, error } = await admin.rpc("respond_to_player_training", {
      p_profile_id: userData.user.id,
      p_training_id: trainingId,
      p_status: status,
    });

    if (error) {
      console.error("Attendance response RPC error:", {
        rpcName: "respond_to_player_training",
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      return NextResponse.json(
        {
          success: false,
          message: "Не вдалося зберегти відповідь.",
        },
        { status: 500 },
      );
    }

    console.info("[attendance] SAVED", {
      runtime: decision.runtime,
      mode: decision.configuredMode,
      trainingId,
      playerId: membership.player_id,
      authenticated: true,
    });

    return NextResponse.json({
      success: true,
      suppressed: false,
      saved: true,
      attendance: data,
      runtime: decision.runtime,
      mode: decision.configuredMode,
      reason: decision.reason,
      message: "Відповідь збережено.",
    });
  } catch (error) {
    console.error("Attendance response API error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Сталася помилка під час збереження відповіді.",
      },
      { status: 500 },
    );
  }
}
