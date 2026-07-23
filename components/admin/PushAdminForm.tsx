"use client";

import { useState } from "react";

type SendState = "idle" | "sending" | "success" | "error";

type SendResult = {
  success?: boolean;
  sent?: number;
  failed?: number;
  removedExpired?: number;
  message?: string;
};

const DEFAULT_TITLE = "СК Олімп Футзал";
const DEFAULT_BODY = "Тестове Push-сповіщення працює! ⚽";
const DEFAULT_URL = "/training";

export default function PushAdminForm() {
  const [secret, setSecret] = useState("");
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [url, setUrl] = useState(DEFAULT_URL);
  const [playerId, setPlayerId] = useState("");
  const [sendState, setSendState] = useState<SendState>("idle");
  const [result, setResult] = useState<SendResult | null>(null);

  const isDisabled =
    sendState === "sending" || !secret.trim() || !title.trim() || !body.trim();

  async function sendPush() {
    setSendState("sending");
    setResult(null);

    try {
      const response = await fetch("/api/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-push-secret": secret.trim(),
        },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          url: url.trim() || DEFAULT_URL,
          playerId: playerId.trim() || undefined,
        }),
      });

      const data = (await response.json()) as SendResult;

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Не вдалося надіслати сповіщення.");
      }

      setResult(data);
      setSendState("success");
    } catch (error) {
      setResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Сталася помилка під час відправлення.",
      });
      setSendState("error");
    }
  }

  function useTestTemplate() {
    setTitle(DEFAULT_TITLE);
    setBody(DEFAULT_BODY);
    setUrl(DEFAULT_URL);
    setPlayerId("");
    setResult(null);
    setSendState("idle");
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white p-5 text-slate-950 shadow-2xl shadow-black/20 sm:p-8">
      <div className="grid gap-6">
        <div>
          <label
            htmlFor="push-secret"
            className="text-sm font-black uppercase tracking-[0.16em] text-slate-600"
          >
            Секрет адміністратора
          </label>

          <input
            id="push-secret"
            type="password"
            value={secret}
            autoComplete="off"
            onChange={(event) => setSecret(event.target.value)}
            placeholder="Вставте PUSH_ADMIN_SECRET"
            className="mt-3 min-h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
          />

          <p className="mt-2 text-xs leading-5 text-slate-500">
            Значення не зберігається у браузері та використовується лише для
            цього запиту.
          </p>
        </div>

        <div>
          <label
            htmlFor="push-title"
            className="text-sm font-black uppercase tracking-[0.16em] text-slate-600"
          >
            Заголовок
          </label>

          <input
            id="push-title"
            type="text"
            value={title}
            maxLength={80}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-3 min-h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
          />
        </div>

        <div>
          <label
            htmlFor="push-body"
            className="text-sm font-black uppercase tracking-[0.16em] text-slate-600"
          >
            Текст повідомлення
          </label>

          <textarea
            id="push-body"
            value={body}
            maxLength={240}
            rows={4}
            onChange={(event) => setBody(event.target.value)}
            className="mt-3 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
          />

          <p className="mt-2 text-right text-xs text-slate-400">
            {body.length}/240
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="push-url"
              className="text-sm font-black uppercase tracking-[0.16em] text-slate-600"
            >
              Сторінка після натискання
            </label>

            <input
              id="push-url"
              type="text"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="/training"
              className="mt-3 min-h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <div>
            <label
              htmlFor="push-player-id"
              className="text-sm font-black uppercase tracking-[0.16em] text-slate-600"
            >
              Player ID
            </label>

            <input
              id="push-player-id"
              type="text"
              value={playerId}
              onChange={(event) => setPlayerId(event.target.value)}
              placeholder="Порожньо = усім"
              className="mt-3 min-h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          Якщо поле <strong>Player ID</strong> порожнє, повідомлення буде
          надіслано на всі активні Push-підписки.
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={useTestTemplate}
            disabled={sendState === "sending"}
            className="min-h-13 rounded-full border border-slate-300 px-5 py-3 font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            🧪 Тестовий шаблон
          </button>

          <button
            type="button"
            onClick={sendPush}
            disabled={isDisabled}
            className="min-h-13 rounded-full bg-slate-950 px-5 py-3 font-black text-white transition enabled:hover:-translate-y-0.5 enabled:hover:bg-sky-500 enabled:hover:text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
          >
            {sendState === "sending" ? "Відправлення..." : "📤 Надіслати Push"}
          </button>
        </div>

        {result && (
          <div
            role={sendState === "error" ? "alert" : "status"}
            className={`rounded-2xl border px-5 py-4 ${
              sendState === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-900"
            }`}
          >
            <p className="font-black">
              {sendState === "success"
                ? "Push надіслано"
                : "Помилка відправлення"}
            </p>

            <p className="mt-1 text-sm leading-6">{result.message}</p>

            {sendState === "success" && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-white px-3 py-1">
                  Надіслано: {result.sent ?? 0}
                </span>
                <span className="rounded-full bg-white px-3 py-1">
                  Помилок: {result.failed ?? 0}
                </span>
                <span className="rounded-full bg-white px-3 py-1">
                  Видалено застарілих: {result.removedExpired ?? 0}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
