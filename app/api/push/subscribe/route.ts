import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SubscribeRequest = {
  playerId?: string;
  playerName?: string;
  subscription?: {
    endpoint?: string;
    keys?: {
      p256dh?: string;
      auth?: string;
    };
  };
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Push subscribe environment variables are missing");

      return NextResponse.json(
        {
          success: false,
          message: "Сервер сповіщень не налаштований.",
        },
        {
          status: 500,
        },
      );
    }

    const body = (await request.json()) as SubscribeRequest;

    const playerId = body.playerId?.trim();
    const playerName = body.playerName?.trim();
    const endpoint = body.subscription?.endpoint?.trim();
    const p256dh = body.subscription?.keys?.p256dh?.trim();
    const auth = body.subscription?.keys?.auth?.trim();

    if (!playerId || !endpoint || !p256dh || !auth) {
      return NextResponse.json(
        {
          success: false,
          message: "Отримано неповні дані Push-підписки.",
        },
        {
          status: 400,
        },
      );
    }

    const { data: player, error: playerError } = await createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    )
      .from("players")
      .select("id, full_name, is_active")
      .eq("id", playerId)
      .eq("is_active", true)
      .maybeSingle();

    if (playerError) {
      console.error("Push player validation error:", playerError);

      return NextResponse.json(
        {
          success: false,
          message: "Не вдалося перевірити профіль гравця.",
        },
        {
          status: 500,
        },
      );
    }

    if (!player) {
      return NextResponse.json(
        {
          success: false,
          message: "Активного гравця не знайдено.",
        },
        {
          status: 404,
        },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        endpoint,
        p256dh,
        auth,
        player_id: player.id,
        player_name: playerName || player.full_name,
        user_agent: request.headers.get("user-agent"),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "endpoint",
      },
    );

    if (error) {
      console.error("Push subscription saving error:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Не вдалося зберегти Push-підписку.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Сповіщення успішно підключено.",
    });
  } catch (error) {
    console.error("Push subscribe API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Сталася помилка під час підключення сповіщень.",
      },
      {
        status: 500,
      },
    );
  }
}
