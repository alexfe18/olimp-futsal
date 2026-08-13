"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { usePlayerSession } from "@/components/auth/PlayerAccessGate";
import {
  createEmptyTrainingAttendanceSummary,
  formatTrainingDate,
  formatTrainingTime,
  loadPlayerTrainingAttendancePresentation,
  loadPlayerVisibleTraining,
  type PlayerTrainingAttendanceSummary,
  type PlayerVisibleTraining,
} from "@/lib/player/training-visibility";
import { supabase } from "@/lib/supabase";

type PlayerAttendanceStatus = "yes" | "maybe" | "no";

type PlayerAttendanceResult = {
  training_id: string;
  player_id: string;
  player_name: string;
  status: PlayerAttendanceStatus | null;
  updated_at: string | null;
};

type AttendanceMessage = {
  tone: "success" | "warning" | "error";
  text: string;
};

function isPlayerAttendanceStatus(
  status: string | null | undefined,
): status is PlayerAttendanceStatus {
  return status === "yes" || status === "maybe" || status === "no";
}

function getAttendanceLabel(status: PlayerAttendanceStatus | null) {
  if (status === "yes") {
    return "Ви будете на тренуванні";
  }

  if (status === "maybe") {
    return "Ваша участь під питанням";
  }

  if (status === "no") {
    return "Ви не будете на тренуванні";
  }

  return "Відповідь ще не надано";
}

function getAttendanceSuccessMessage(status: PlayerAttendanceStatus) {
  if (status === "yes") {
    return "Готово. Ви підтвердили участь у тренуванні.";
  }

  if (status === "maybe") {
    return "Готово. Ви поки не впевнені щодо участі у тренуванні.";
  }

  return "Готово. Ви повідомили, що не будете на тренуванні.";
}

function formatAttendanceUpdatedAt(value: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Kyiv",
  }).format(new Date(value));
}

export default function PlayerTrainingDetailsPage() {
  const params = useParams<{ trainingId: string }>();
  const { context } = usePlayerSession();
  const teamId = context.team?.id ?? null;
  const playerId = context.player?.id ?? null;
  const trainingId = params.trainingId;

  const [training, setTraining] = useState<PlayerVisibleTraining | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [attendanceStatus, setAttendanceStatus] =
    useState<PlayerAttendanceStatus | null>(null);
  const [attendanceUpdatedAt, setAttendanceUpdatedAt] =
    useState<string | null>(null);
  const [attendanceSummary, setAttendanceSummary] =
    useState<PlayerTrainingAttendanceSummary | null>(null);
  const [attendanceSummaryMessage, setAttendanceSummaryMessage] =
    useState<string | null>(null);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [isAttendanceSaving, setIsAttendanceSaving] = useState(false);
  const [attendanceMessage, setAttendanceMessage] =
    useState<AttendanceMessage | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!teamId || !trainingId) {
        if (active) {
          setTraining(null);
          setMessage("Тренування недоступне.");
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setMessage(null);

      try {
        const data = await loadPlayerVisibleTraining(teamId, trainingId);
        if (!active) return;

        setTraining(data);

        if (!data) {
          setMessage("Тренування недоступне або більше не опубліковане.");
        }
      } catch (error) {
        console.error("Player training details error:", error);

        if (!active) return;

        setTraining(null);
        setMessage("Не вдалося завантажити тренування. Спробуйте ще раз.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [teamId, trainingId]);

  useEffect(() => {
    let active = true;

    async function loadAttendance() {
      if (!training?.id) {
        if (active) {
          setAttendanceStatus(null);
          setAttendanceUpdatedAt(null);
          setAttendanceSummary(null);
          setAttendanceSummaryMessage(null);
        }
        return;
      }

      setIsAttendanceLoading(true);
      setAttendanceMessage(null);
      setAttendanceSummaryMessage(null);

      const { data, error } = await supabase.rpc(
        "get_my_training_attendance",
        {
          p_training_id: training.id,
        },
      );

      if (!active) return;

      if (error) {
        console.error("Player attendance loading error:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });

        setAttendanceStatus(null);
        setAttendanceUpdatedAt(null);
        setAttendanceMessage({
          tone: "error",
          text: "Не вдалося завантажити вашу відповідь.",
        });
      } else {
        const result = data as PlayerAttendanceResult | null;

        setAttendanceStatus(
          isPlayerAttendanceStatus(result?.status) ? result.status : null,
        );
        setAttendanceUpdatedAt(result?.updated_at ?? null);
      }

      try {
        const presentation = await loadPlayerTrainingAttendancePresentation(
          [training.id],
          playerId,
        );

        if (!active) return;

        setAttendanceSummary(
          presentation[training.id] ??
            createEmptyTrainingAttendanceSummary(training.id),
        );
      } catch (summaryError) {
        console.error(
          "Player training attendance summary loading error:",
          summaryError,
        );

        if (!active) return;

        setAttendanceSummary(null);
        setAttendanceSummaryMessage(
          "Кількість відповідей команди тимчасово недоступна.",
        );
      } finally {
        if (active) setIsAttendanceLoading(false);
      }
    }

    void loadAttendance();

    return () => {
      active = false;
    };
  }, [playerId, training?.id]);

  async function refreshAttendanceSummary() {
    if (!training?.id) return;

    try {
      const presentation = await loadPlayerTrainingAttendancePresentation(
        [training.id],
        playerId,
      );

      setAttendanceSummary(
        presentation[training.id] ??
          createEmptyTrainingAttendanceSummary(training.id),
      );
      setAttendanceSummaryMessage(null);
    } catch (summaryError) {
      console.error(
        "Player training attendance summary refresh error:",
        summaryError,
      );

      setAttendanceSummaryMessage(
        "Відповідь збережена, але кількість відповідей команди не вдалося оновити.",
      );
    }
  }

  async function saveAttendance(status: PlayerAttendanceStatus) {
    if (!training?.id || isAttendanceSaving) return;

    setIsAttendanceSaving(true);
    setAttendanceMessage(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Сесію гравця не знайдено.");
      }

      const response = await fetch("/api/attendance/respond", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          trainingId: training.id,
          status,
        }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        suppressed?: boolean;
        message?: string;
        attendance?: PlayerAttendanceResult;
      };

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Не вдалося зберегти відповідь.",
        );
      }

      if (result.suppressed) {
        setAttendanceMessage({
          tone: "warning",
          text:
            result.message ||
            "Локальний safe mode: відповідь не записана в базу.",
        });
        return;
      }

      const savedStatus = result.attendance?.status;

      setAttendanceStatus(
        isPlayerAttendanceStatus(savedStatus) ? savedStatus : status,
      );
      setAttendanceUpdatedAt(
        result.attendance?.updated_at ?? new Date().toISOString(),
      );
      setAttendanceMessage({
        tone: "success",
        text: getAttendanceSuccessMessage(status),
      });

      await refreshAttendanceSummary();
    } catch (error) {
      console.error("Player attendance saving error:", error);

      setAttendanceMessage({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Не вдалося зберегти відповідь.",
      });
    } finally {
      setIsAttendanceSaving(false);
    }
  }

  const attendanceMessageClassName =
    attendanceMessage?.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : attendanceMessage?.tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-rose-200 bg-rose-50 text-rose-900";

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-950 md:pb-0">
      <section className="bg-slate-950 px-5 py-9 text-white">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/player/trainings"
            className="text-sm font-black text-sky-400 transition hover:text-sky-300"
          >
            ← Усі тренування
          </Link>

          <p className="mt-7 text-xs font-black uppercase tracking-[0.24em] text-sky-400">
            Тренування
          </p>

          <h1 className="mt-3 text-4xl font-black">Деталі тренування</h1>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-9">
        {isLoading && (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
            <p className="font-bold text-slate-500">
              Завантажуємо тренування…
            </p>
          </div>
        )}

        {!isLoading && message && (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-black">Тренування недоступне</h2>

            <p className="mt-3 leading-7 text-slate-600">{message}</p>

            <Link
              href="/player/trainings"
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 font-black text-white"
            >
              Повернутися до тренувань
            </Link>
          </div>
        )}

        {!isLoading && training && (
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-800">
                Опубліковано
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-700">
                {training.team_name ?? context.team?.name ?? "Олімп Футзал"}
              </span>
            </div>

            <h2 className="mt-5 text-3xl font-black">{training.title}</h2>

            <dl className="mt-8 grid gap-5 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-5">
                <dt className="text-sm font-bold text-slate-500">Дата</dt>

                <dd className="mt-2 font-black capitalize">
                  {formatTrainingDate(training.starts_at)}
                </dd>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5">
                <dt className="text-sm font-bold text-slate-500">Час</dt>

                <dd className="mt-2 font-black">
                  {formatTrainingTime(training.starts_at)}
                </dd>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5 sm:col-span-2">
                <dt className="text-sm font-bold text-slate-500">Місце</dt>

                <dd className="mt-2 font-black">{training.location}</dd>
              </div>
            </dl>

            <section className="mt-8 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-700">
                Ваша участь
              </p>

              <h3 className="mt-3 text-2xl font-black">
                {isAttendanceLoading
                  ? "Завантажуємо вашу відповідь…"
                  : getAttendanceLabel(attendanceStatus)}
              </h3>

              {!isAttendanceLoading && attendanceUpdatedAt && (
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Оновлено: {formatAttendanceUpdatedAt(attendanceUpdatedAt)}
                </p>
              )}

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  disabled={isAttendanceLoading || isAttendanceSaving}
                  onClick={() => void saveAttendance("yes")}
                  className={`min-h-14 rounded-2xl border px-5 font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    attendanceStatus === "yes"
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
                  }`}
                >
                  ✓ Буду
                </button>

                <button
                  type="button"
                  disabled={isAttendanceLoading || isAttendanceSaving}
                  onClick={() => void saveAttendance("maybe")}
                  className={`min-h-14 rounded-2xl border px-5 font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    attendanceStatus === "maybe"
                      ? "border-amber-500 bg-amber-400 text-slate-950"
                      : "border-amber-200 bg-white text-amber-800 hover:bg-amber-50"
                  }`}
                >
                  ? Під питанням
                </button>

                <button
                  type="button"
                  disabled={isAttendanceLoading || isAttendanceSaving}
                  onClick={() => void saveAttendance("no")}
                  className={`min-h-14 rounded-2xl border px-5 font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    attendanceStatus === "no"
                      ? "border-rose-600 bg-rose-600 text-white"
                      : "border-rose-200 bg-white text-rose-800 hover:bg-rose-50"
                  }`}
                >
                  ✕ Не буду
                </button>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-500">
                Відповідь можна змінити, поки тренування залишається
                опублікованим і активним.
              </p>

              {attendanceMessage && (
                <div
                  className={`mt-5 rounded-2xl border p-4 text-sm font-bold ${attendanceMessageClassName}`}
                  aria-live="polite"
                >
                  {attendanceMessage.text}
                </div>
              )}

              <div className="mt-6 border-t border-slate-200 pt-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Відповіді команди
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      У кабінеті гравця показуємо лише кількість.
                    </p>
                  </div>

                  {attendanceSummary && (
                    <span className="text-sm font-bold text-slate-500">
                      Всього відповіли: {attendanceSummary.total}
                    </span>
                  )}
                </div>

                {attendanceSummary ? (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-2xl bg-emerald-100 px-3 py-4 text-center">
                      <strong className="block text-2xl text-emerald-900">
                        {attendanceSummary.yes}
                      </strong>
                      <span className="mt-1 block text-xs font-black text-emerald-700">
                        Будуть
                      </span>
                    </div>

                    <div className="rounded-2xl bg-amber-100 px-3 py-4 text-center">
                      <strong className="block text-2xl text-amber-900">
                        {attendanceSummary.maybe}
                      </strong>
                      <span className="mt-1 block text-xs font-black text-amber-700">
                        Під питанням
                      </span>
                    </div>

                    <div className="rounded-2xl bg-rose-100 px-3 py-4 text-center">
                      <strong className="block text-2xl text-rose-900">
                        {attendanceSummary.no}
                      </strong>
                      <span className="mt-1 block text-xs font-black text-rose-700">
                        Не будуть
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-500">
                    {attendanceSummaryMessage ||
                      "Завантажуємо кількість відповідей…"}
                  </p>
                )}

                {attendanceSummaryMessage && attendanceSummary && (
                  <p className="mt-3 text-sm font-bold text-amber-700">
                    {attendanceSummaryMessage}
                  </p>
                )}
              </div>
            </section>

            <div className="mt-8 rounded-2xl border border-sky-100 bg-sky-50 p-5">
              <p className="font-black text-sky-950">
                Інформація про тренування
              </p>

              <p className="mt-2 leading-7 text-sky-950">
                Тут відображаються актуальні дата, час і місце проведення
                тренування. У разі змін інформація буде оновлена тренером.
              </p>
            </div>

            <nav
              aria-label="Навігація кабінету гравця"
              className="mt-8 grid gap-3 sm:grid-cols-2"
            >
              <Link
                href="/player/trainings"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 font-black text-slate-800 transition hover:bg-slate-50"
              >
                ← До тренувань
              </Link>

              <Link
                href="/player"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 font-black text-white transition hover:bg-slate-800"
              >
                До кабінету →
              </Link>
            </nav>
          </article>
        )}
      </section>
    </main>
  );
}
