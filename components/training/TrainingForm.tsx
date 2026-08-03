"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import PlayerSelect from "./PlayerSelect";
import { statusOptions } from "./constants";
import type { AttendanceStatus, FeedbackState, PlayerRecord } from "./types";

type TrainingFormProps = {
  players: PlayerRecord[];
  selectedPlayerId: string;
  rememberedName: string;
  currentStatus: AttendanceStatus | null;
  selectedStatus: AttendanceStatus | null;
  feedback: FeedbackState;
  hasTraining: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  isSubmitDisabled: boolean;
  onPlayerSelect: (player: PlayerRecord) => void;
  onClearPlayer: () => void;
  onStatusSelect: (status: AttendanceStatus) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

type PushState =
  | "checking"
  | "unsupported"
  | "idle"
  | "subscribing"
  | "enabled"
  | "denied"
  | "error";

function getFriendlyPlayerName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);

  if (parts.length >= 2) {
    return `${parts[1]} ${parts[0]}`;
  }

  return fullName;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);

  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);

  return Uint8Array.from(
    [...rawData].map((character) => character.charCodeAt(0)),
  );
}

async function savePushSubscription({
  player,
  subscription,
}: {
  player: PlayerRecord;
  subscription: PushSubscription;
}) {
  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      playerId: player.id,
      playerName: player.fullName,
      subscription: subscription.toJSON(),
    }),
  });

  const result = (await response.json()) as {
    success?: boolean;
    message?: string;
  };

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Не вдалося зберегти Push-підписку.");
  }
}

export default function TrainingForm({
  players,
  selectedPlayerId,
  rememberedName,
  currentStatus,
  selectedStatus,
  feedback,
  hasTraining,
  isLoading,
  isSubmitting,
  isSubmitDisabled,
  onPlayerSelect,
  onClearPlayer,
  onStatusSelect,
  onSubmit,
}: TrainingFormProps) {
  const [isProfileChangeOpen, setIsProfileChangeOpen] = useState(false);

  const [pushState, setPushState] = useState<PushState>("checking");

  const [pushMessage, setPushMessage] = useState("");

  const selectedPlayer = useMemo(
    () => players.find((player) => player.id === selectedPlayerId) ?? null,
    [players, selectedPlayerId],
  );

  const currentStatusLabel =
    statusOptions.find((option) => option.value === currentStatus)?.label ??
    null;

  const isFormDisabled = !hasTraining || isLoading || isSubmitting;

  const isProfileLocked = Boolean(currentStatus);

  /*
   * Проверяем поддержку Push и наличие уже созданной подписки.
   * Если подписка существует, повторно связываем её с выбранным игроком.
   */
  useEffect(() => {
    let isMounted = true;

    async function checkPushSubscription() {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        if (isMounted) {
          setPushState("unsupported");
        }

        return;
      }

      if (Notification.permission === "denied") {
        if (isMounted) {
          setPushState("denied");
        }

        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;

        const subscription = await registration.pushManager.getSubscription();

        if (!isMounted) {
          return;
        }

        if (!subscription) {
          setPushState("idle");
          return;
        }

        setPushState("enabled");

        /*
         * Если профиль уже выбран, обновляем связь:
         * устройство → текущий игрок.
         */
        if (selectedPlayer) {
          try {
            await savePushSubscription({
              player: selectedPlayer,
              subscription,
            });
          } catch (error) {
            console.error("Push subscription sync error:", error);
          }
        }
      } catch (error) {
        console.error("Push status checking error:", error);

        if (isMounted) {
          setPushState("error");
          setPushMessage("Не вдалося перевірити стан сповіщень.");
        }
      }
    }

    void checkPushSubscription();

    return () => {
      isMounted = false;
    };
  }, [selectedPlayer]);

  async function handleEnablePush() {
    if (!selectedPlayer) {
      setPushState("error");
      setPushMessage("Спочатку оберіть свій профіль у списку гравців.");
      return;
    }

    const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!publicVapidKey) {
      console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing");

      setPushState("error");
      setPushMessage("Публічний ключ сповіщень не налаштовано.");
      return;
    }

    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setPushState("unsupported");
      return;
    }

    setPushState("subscribing");
    setPushMessage("");

    try {
      const permission = await Notification.requestPermission();

      if (permission === "denied") {
        setPushState("denied");
        setPushMessage(
          "Доступ до сповіщень заборонено в налаштуваннях браузера.",
        );
        return;
      }

      if (permission !== "granted") {
        setPushState("idle");
        setPushMessage("Дозвіл на сповіщення поки не надано.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
        });
      }

      await savePushSubscription({
        player: selectedPlayer,
        subscription,
      });

      setPushState("enabled");
      setPushMessage("Тепер ви отримуватимете новини про тренування.");
    } catch (error) {
      console.error("Push subscription error:", error);

      setPushState("error");

      setPushMessage(
        error instanceof Error
          ? error.message
          : "Не вдалося підключити сповіщення.",
      );
    }
  }

  function confirmProfileChange() {
    onClearPlayer();
    setIsProfileChangeOpen(false);
  }

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-xl shadow-sky-950/5 transition-shadow duration-300 hover:shadow-2xl hover:shadow-sky-950/10 sm:p-7"
      >
        {rememberedName && (
          <div className="mb-6 rounded-2xl border border-sky-100 bg-sky-50 px-5 py-4">
            <p className="text-sm font-black text-sky-800">
              👋 Вітаємо, {getFriendlyPlayerName(rememberedName)}!
            </p>

            {currentStatusLabel && (
              <p className="mt-2 text-sm text-slate-600">
                Ваш поточний вибір:{" "}
                <strong className="text-slate-950">{currentStatusLabel}</strong>
              </p>
            )}
          </div>
        )}

        {isProfileLocked && selectedPlayer ? (
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-600">
              Ваш профіль
            </p>

            <div className="mt-3 rounded-2xl border border-sky-300 bg-sky-50 px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <strong className="block truncate text-base text-slate-950">
                    {selectedPlayer.fullName}
                  </strong>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-black text-sky-700">
                      {selectedPlayer.shirtNumber !== null
                        ? `№${selectedPlayer.shirtNumber}`
                        : "Без номера"}
                    </span>

                    {selectedPlayer.position && (
                      <span>{selectedPlayer.position}</span>
                    )}
                  </div>
                </div>

                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-black text-emerald-700"
                >
                  ✓
                </span>
              </div>
            </div>
          </div>
        ) : (
          <PlayerSelect
            players={players}
            selectedPlayerId={selectedPlayerId}
            disabled={isFormDisabled}
            onPlayerSelect={onPlayerSelect}
          />
        )}

        {players.length === 0 && !isLoading && (
          <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
            Список гравців поки недоступний.
          </p>
        )}

        <fieldset className="mt-7" disabled={isFormDisabled}>
          <legend className="text-sm font-black uppercase tracking-[0.18em] text-slate-600">
            Ваша відповідь
          </legend>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {statusOptions.map((option) => {
              const isSelected = selectedStatus === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onStatusSelect(option.value)}
                  aria-pressed={isSelected}
                  className={`min-h-14 rounded-2xl border px-4 py-3 text-sm font-black transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60 ${
                    isSelected
                      ? "scale-[1.03] border-sky-400 bg-sky-400 text-slate-950 shadow-lg shadow-sky-400/25"
                      : "border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50 hover:shadow-md"
                  }`}
                >
                  <span
                    className={`mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      isSelected
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {option.icon}
                  </span>

                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="mt-7 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-slate-950 px-7 py-4 text-base font-black text-white transition-all duration-300 enabled:hover:-translate-y-1 enabled:hover:bg-sky-500 enabled:hover:text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
        >
          {isSubmitting
            ? "Збереження..."
            : currentStatus
              ? "Оновити відповідь"
              : "Підтвердити участь"}
        </button>

        {hasTraining && feedback.type && (
          <div
            role={feedback.type === "error" ? "alert" : "status"}
            className={`mt-5 rounded-2xl border px-5 py-5 ${
              feedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-900"
            }`}
          >
            <div className="flex items-start gap-4">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl font-black ${
                  feedback.type === "success"
                    ? "bg-emerald-500 text-white"
                    : "bg-red-500 text-white"
                }`}
              >
                {feedback.type === "success" ? "✓" : "!"}
              </span>

              <div>
                <p className="font-black">{feedback.title}</p>

                <p className="mt-1 text-sm leading-6 opacity-80">
                  {feedback.description}
                </p>
              </div>
            </div>
          </div>
        )}

        {selectedPlayer && (
          <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-5">
            <div className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-500 text-xl text-white"
              >
                🔔
              </span>

              <div className="min-w-0 flex-1">
                <p className="font-black text-slate-950">
                  Сповіщення про тренування
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Отримуйте повідомлення про нові тренування, зміни часу та
                  скасування.
                </p>

                {pushState === "checking" && (
                  <p className="mt-3 text-sm font-bold text-slate-500">
                    Перевіряємо стан сповіщень...
                  </p>
                )}

                {pushState === "unsupported" && (
                  <p className="mt-3 text-sm font-bold text-amber-800">
                    Цей браузер або пристрій не підтримує Push-сповіщення.
                  </p>
                )}

                {pushState === "denied" && (
                  <p className="mt-3 text-sm font-bold text-red-700">
                    Сповіщення заблоковано. Дозвольте їх у налаштуваннях
                    браузера або застосунку.
                  </p>
                )}

                {pushState === "enabled" && (
                  <p className="mt-3 text-sm font-black text-emerald-700">
                    ✓ Сповіщення увімкнені
                  </p>
                )}

                {pushMessage && (
                  <p
                    className={`mt-2 text-sm leading-6 ${
                      pushState === "error" || pushState === "denied"
                        ? "font-bold text-red-700"
                        : "text-slate-600"
                    }`}
                  >
                    {pushMessage}
                  </p>
                )}

                {(pushState === "idle" || pushState === "error") && (
                  <button
                    type="button"
                    onClick={handleEnablePush}
                    disabled={!selectedPlayer}
                    className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-sky-500 px-5 py-2.5 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-950 hover:text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                  >
                    Увімкнути сповіщення
                  </button>
                )}

                {pushState === "subscribing" && (
                  <button
                    type="button"
                    disabled
                    className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-slate-300 px-5 py-2.5 text-sm font-black text-slate-600"
                  >
                    Підключення...
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {isProfileLocked && (
          <div className="mt-6 border-t border-slate-100 pt-5 text-center">
            <button
              type="button"
              onClick={() => setIsProfileChangeOpen(true)}
              disabled={isSubmitting}
              className="text-xs font-black text-slate-500 underline decoration-slate-300 underline-offset-4 transition hover:text-sky-700 disabled:opacity-50"
            >
              Це не ви? Змінити профіль
            </button>
          </div>
        )}
      </form>

      {isProfileChangeOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="change-profile-title"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsProfileChangeOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl">
              ⚠
            </div>

            <h2
              id="change-profile-title"
              className="mt-5 text-2xl font-black text-slate-950"
            >
              Змінити профіль?
            </h2>

            <p className="mt-3 leading-7 text-slate-600">
              Поточний голос залишиться збереженим. Після зміни профілю ви
              зможете обрати іншого гравця та проголосувати від його імені.
            </p>

            <p className="mt-3 text-sm font-bold text-amber-800">
              Використовуйте цю дію лише якщо випадково обрали не себе.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setIsProfileChangeOpen(false)}
                className="min-h-12 rounded-full border border-slate-300 px-5 py-3 font-black text-slate-700 transition hover:bg-slate-100"
              >
                Скасувати
              </button>

              <button
                type="button"
                onClick={confirmProfileChange}
                className="min-h-12 rounded-full bg-slate-950 px-5 py-3 font-black text-white transition hover:bg-amber-500 hover:text-slate-950"
              >
                Так, змінити
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
