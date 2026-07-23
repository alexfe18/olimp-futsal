import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webPush from "web-push";

type SendPushRequest = {
  title?: string;
  body?: string;
  url?: string;
  playerId?: string;
};

type PushSubscriptionRecord = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

const vapidSubject = process.env.VAPID_SUBJECT;

const adminSecret = process.env.PUSH_ADMIN_SECRET;

export async function POST(request: Request) {
  try {
    const requestSecret = request.headers.get("x-push-secret");

    if (!adminSecret || requestSecret !== adminSecret) {
      return NextResponse.json(
        {
          success: false,
          message: "Недостатньо прав для відправлення.",
        },
        {
          status: 401,
        },
      );
    }

    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !vapidPublicKey ||
      !vapidPrivateKey ||
      !vapidSubject
    ) {
      console.error("Push environment variables are missing");

      return NextResponse.json(
        {
          success: false,
          message: "Сервер Push-сповіщень не налаштований.",
        },
        {
          status: 500,
        },
      );
    }

    const body = (await request.json()) as SendPushRequest;

    const title = body.title?.trim() || "СК Олімп Футзал";

    const message = body.body?.trim() || "Нове повідомлення від команди.";

    const targetUrl = body.url?.trim() || "/training";

    const playerId = body.playerId?.trim();

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    let query = supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth");

    if (playerId) {
      query = query.eq("player_id", playerId);
    }

    const { data, error: subscriptionsError } = await query;

    if (subscriptionsError) {
      console.error("Push subscriptions loading error:", subscriptionsError);

      return NextResponse.json(
        {
          success: false,
          message: "Не вдалося завантажити Push-підписки.",
        },
        {
          status: 500,
        },
      );
    }

    const subscriptions = (data ?? []) as PushSubscriptionRecord[];

    if (!subscriptions.length) {
      return NextResponse.json(
        {
          success: false,
          message: "Активних Push-підписок не знайдено.",
        },
        {
          status: 404,
        },
      );
    }

    webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const payload = JSON.stringify({
      title,
      body: message,
      url: targetUrl,
      icon: "/icons/icon-192.png",
      badge: "/icons/notification-icon-64.png",
      tag: "olimp-futsal-training",
    });

    let sent = 0;
    let failed = 0;

    const expiredSubscriptionIds: string[] = [];

    await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        try {
          await webPush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            payload,
            {
              TTL: 60 * 60,
              urgency: "high",
            },
          );

          sent += 1;
        } catch (error) {
          failed += 1;

          const statusCode =
            typeof error === "object" && error !== null && "statusCode" in error
              ? Number(error.statusCode)
              : null;

          if (statusCode === 404 || statusCode === 410) {
            expiredSubscriptionIds.push(subscription.id);
          }

          console.error("Push sending error:", error);
        }
      }),
    );

    if (expiredSubscriptionIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", expiredSubscriptionIds);

      if (deleteError) {
        console.error("Expired subscriptions cleanup error:", deleteError);
      }
    }

    return NextResponse.json({
      success: sent > 0,
      sent,
      failed,
      removedExpired: expiredSubscriptionIds.length,
      message:
        sent > 0
          ? `Надіслано сповіщень: ${sent}.`
          : "Не вдалося надіслати сповіщення.",
    });
  } catch (error) {
    console.error("Push send API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Сталася помилка під час відправлення.",
      },
      {
        status: 500,
      },
    );
  }
}
