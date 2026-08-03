import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

type PushPayload = {
  title?: string;
  body?: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  vibrate?: number[];
  renotify?: boolean;
  requireInteraction?: boolean;
};

type ExtendedNotificationOptions = NotificationOptions & {
  vibrate?: number[];
};

const fallbackPayload: Required<PushPayload> = {
  title: "Олімп Футзал",
  body: "У застосунку з’явилося нове повідомлення.",
  url: "/training",
  icon: "/icons/icon-192.png",
  badge: "/icons/notification-icon-64.png",
  tag: "olimp-futsal-notification",
  vibrate: [250, 100, 250],
  renotify: true,
  requireInteraction: true,
};

self.addEventListener("push", (event: PushEvent) => {
  let payload: PushPayload = fallbackPayload;

  if (event.data) {
    try {
      payload = {
        ...fallbackPayload,
        ...(event.data.json() as PushPayload),
      };
    } catch {
      payload = {
        ...fallbackPayload,
        body: event.data.text() || fallbackPayload.body,
      };
    }
  }

  const notificationOptions: ExtendedNotificationOptions = {
    body: payload.body || fallbackPayload.body,
    icon: payload.icon || fallbackPayload.icon,
    badge: payload.badge || fallbackPayload.badge,
    tag: payload.tag || fallbackPayload.tag,

    vibrate: payload.vibrate || fallbackPayload.vibrate,

    requireInteraction:
      payload.requireInteraction ?? fallbackPayload.requireInteraction,
    silent: false,

    data: {
      url: payload.url || fallbackPayload.url,
    },
  };

  event.waitUntil(
    self.registration.showNotification(
      payload.title || fallbackPayload.title,
      notificationOptions,
    ),
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const targetUrl =
    typeof event.notification.data?.url === "string"
      ? event.notification.data.url
      : "/training";

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then(async (clients) => {
        const absoluteTargetUrl = new URL(targetUrl, self.location.origin).href;

        for (const client of clients) {
          const windowClient = client as WindowClient;

          if (windowClient.url === absoluteTargetUrl) {
            return windowClient.focus();
          }
        }

        for (const client of clients) {
          const windowClient = client as WindowClient;

          if ("navigate" in windowClient) {
            await windowClient.navigate(absoluteTargetUrl);
            return windowClient.focus();
          }
        }

        return self.clients.openWindow(absoluteTargetUrl);
      }),
  );
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  disableDevLogs: true,
});

serwist.addEventListeners();
