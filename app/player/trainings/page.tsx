"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { usePlayerSession } from "@/components/auth/PlayerAccessGate";
import {
  createEmptyTrainingAttendanceSummary,
  formatTrainingDate,
  formatTrainingTime,
  loadPlayerTrainingAttendancePresentation,
  loadPlayerVisibleTrainings,
  type PlayerTrainingAttendanceStatus,
  type PlayerTrainingAttendanceSummary,
  type PlayerVisibleTraining,
} from "@/lib/player/training-visibility";

function getMyAttendanceMeta(status: PlayerTrainingAttendanceStatus | null) {
  if (status === "yes") {
    return {
      label: "Ваша відповідь: Буду",
      className: "bg-emerald-100 text-emerald-800",
    };
  }

  if (status === "maybe") {
    return {
      label: "Ваша відповідь: Під питанням",
      className: "bg-amber-100 text-amber-800",
    };
  }

  if (status === "no") {
    return {
      label: "Ваша відповідь: Не буду",
      className: "bg-rose-100 text-rose-800",
    };
  }

  return {
    label: "Ви ще не відповіли",
    className: "bg-slate-100 text-slate-600",
  };
}

export default function PlayerTrainingsPage() {
  const { context } = usePlayerSession();
  const teamId = context.team?.id ?? null;
  const playerId = context.player?.id ?? null;

  const [trainings, setTrainings] = useState<PlayerVisibleTraining[]>([]);
  const [summaries, setSummaries] = useState<
    Record<string, PlayerTrainingAttendanceSummary>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [presentationMessage, setPresentationMessage] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!teamId) {
        if (active) {
          setTrainings([]);
          setSummaries({});
          setMessage("Не вдалося визначити команду гравця.");
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setMessage(null);
      setPresentationMessage(null);

      try {
        const data = await loadPlayerVisibleTrainings(teamId);
        if (!active) return;

        setTrainings(data);

        try {
          const attendancePresentation =
            await loadPlayerTrainingAttendancePresentation(
              data.map((training) => training.id),
              playerId,
            );

          if (!active) return;
          setSummaries(attendancePresentation);
        } catch (presentationError) {
          console.error(
            "Player training attendance presentation error:",
            presentationError,
          );

          if (!active) return;

          setSummaries({});
          setPresentationMessage(
            "Кількість відповідей тимчасово недоступна. Самі тренування залишаються доступними.",
          );
        }
      } catch (error) {
        console.error("Player training visibility error:", error);
        if (!active) return;

        setTrainings([]);
        setSummaries({});
        setMessage("Не вдалося завантажити тренування. Спробуйте ще раз.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [playerId, teamId]);

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-950 md:pb-0">
      <section className="bg-slate-950 px-5 py-9 text-white">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/player"
            className="text-sm font-black text-sky-400 transition hover:text-sky-300"
          >
            ← Кабінет гравця
          </Link>
          <p className="mt-7 text-xs font-black uppercase tracking-[0.24em] text-sky-400">
            Тренування
          </p>
          <h1 className="mt-3 text-4xl font-black">Тренування команди</h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-300">
            Опубліковані тренування, ваша відповідь та короткий стан команди.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-9">
        {isLoading && (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
            <p className="font-bold text-slate-500">Завантажуємо тренування…</p>
          </div>
        )}

        {!isLoading && message && (
          <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-7">
            <p className="font-bold text-rose-900">{message}</p>
          </div>
        )}

        {!isLoading && !message && presentationMessage && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-900">
            {presentationMessage}
          </div>
        )}

        {!isLoading && !message && trainings.length === 0 && (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <span className="text-4xl">📅</span>
            <h2 className="mt-5 text-2xl font-black">
              Наразі немає опублікованого тренування
            </h2>
            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              Коли тренер опублікує наступне тренування, дата, час і місце
              автоматично з’являться тут.
            </p>
          </div>
        )}

        {!isLoading && !message && trainings.length > 0 && (
          <div className="space-y-5">
            {trainings.map((training, index) => {
              const summary =
                summaries[training.id] ??
                createEmptyTrainingAttendanceSummary(training.id);
              const myAttendanceMeta = getMyAttendanceMeta(summary.myStatus);

              return (
                <Link
                  key={training.id}
                  href={`/player/trainings/${training.id}`}
                  className="block rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl sm:p-7"
                >
                  <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {index === 0 && (
                          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-sky-800">
                            Найближче
                          </span>
                        )}
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-800">
                          Опубліковано
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${myAttendanceMeta.className}`}
                        >
                          {myAttendanceMeta.label}
                        </span>
                      </div>

                      <h2 className="mt-4 text-2xl font-black">
                        {training.title}
                      </h2>
                      <p className="mt-3 capitalize text-slate-600">
                        {formatTrainingDate(training.starts_at)}
                      </p>
                      <p className="mt-1 text-lg font-black text-slate-950">
                        {formatTrainingTime(training.starts_at)} ·{" "}
                        {training.location}
                      </p>

                      <div className="mt-5 grid grid-cols-3 gap-2 sm:max-w-xl">
                        <div className="rounded-2xl bg-emerald-50 px-3 py-3">
                          <span className="block text-xs font-bold text-emerald-700">
                            Будуть
                          </span>
                          <strong className="mt-1 block text-xl text-emerald-900">
                            {summary.yes}
                          </strong>
                        </div>
                        <div className="rounded-2xl bg-amber-50 px-3 py-3">
                          <span className="block text-xs font-bold text-amber-700">
                            Під питанням
                          </span>
                          <strong className="mt-1 block text-xl text-amber-900">
                            {summary.maybe}
                          </strong>
                        </div>
                        <div className="rounded-2xl bg-rose-50 px-3 py-3">
                          <span className="block text-xs font-bold text-rose-700">
                            Не будуть
                          </span>
                          <strong className="mt-1 block text-xl text-rose-900">
                            {summary.no}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <span className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-full bg-slate-950 px-6 font-black text-white sm:w-auto">
                      Деталі →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
