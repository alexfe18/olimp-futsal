import { createClient } from "@supabase/supabase-js";
import webPush from "web-push";

import {
  getPushDeliveryDecision,
  type PushRuntimeEnvironment,
  type PushSendMode,
} from "@/lib/server/push-environment";

type PushSubscriptionRecord = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushMessage = {
  title: string;
  body: string;
  url: string;
  playerId?: string;
  tag?: string;
};

export type PushSendResult = {
  sent: number;
  failed: number;
  removedExpired: number;
  suppressed: boolean;
  mode: PushSendMode;
  runtime: PushRuntimeEnvironment;
  reason: string;
};

export async function sendPushMessage(
  message: PushMessage,
): Promise<PushSendResult> {
  const delivery = getPushDeliveryDecision();

  if (!delivery.allowed) {
    console.info("[push] SUPPRESSED", {
      runtime: delivery.runtime,
      mode: delivery.configuredMode,
      reason: delivery.reason,
      requestedTarget: message.playerId ? "single-player" : "broadcast",
    });

    return {
      sent: 0,
      failed: 0,
      removedExpired: 0,
      suppressed: true,
      mode: delivery.configuredMode,
      runtime: delivery.runtime,
      reason: delivery.reason,
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;

  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    !vapidPublicKey ||
    !vapidPrivateKey ||
    !vapidSubject
  ) {
    throw new Error("Сервер Push-сповіщень не налаштований.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const effectivePlayerId =
    delivery.configuredMode === "test"
      ? delivery.testPlayerId
      : message.playerId;

  let query = supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");

  if (effectivePlayerId) {
    query = query.eq("player_id", effectivePlayerId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Не вдалося завантажити Push-підписки. ${error.message}`);
  }

  const subscriptions = (data ?? []) as PushSubscriptionRecord[];

  if (!subscriptions.length) {
    throw new Error(
      delivery.configuredMode === "test"
        ? "Для тестового гравця активних Push-підписок не знайдено."
        : "Активних Push-підписок не знайдено.",
    );
  }

  console.info(
    delivery.configuredMode === "test"
      ? "[push] TEST DELIVERY"
      : "[push] LIVE DELIVERY",
    {
      runtime: delivery.runtime,
      mode: delivery.configuredMode,
      target:
        delivery.configuredMode === "test"
          ? "configured-test-player"
          : effectivePlayerId
            ? "single-player"
            : "broadcast",
      subscriptions: subscriptions.length,
    },
  );

  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const payload = JSON.stringify({
    title: message.title,
    body: message.body,
    url: message.url,
    icon: "/icons/icon-192.png",
    badge: "/icons/notification-icon-64.png",
    tag: message.tag ?? "olimp-futsal-training",
    vibrate: [250, 100, 250],
    requireInteraction: true,
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

  if (expiredSubscriptionIds.length) {
    const { error: deleteError } = await supabase
      .from("push_subscriptions")
      .delete()
      .in("id", expiredSubscriptionIds);

    if (deleteError) {
      console.error("Expired subscriptions cleanup error:", deleteError);
    }
  }

  if (!sent) {
    throw new Error("Не вдалося надіслати Push-сповіщення.");
  }

  return {
    sent,
    failed,
    removedExpired: expiredSubscriptionIds.length,
    suppressed: false,
    mode: delivery.configuredMode,
    runtime: delivery.runtime,
    reason: delivery.reason,
  };
}
