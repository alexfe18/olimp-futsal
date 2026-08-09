"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { usePlayerSession } from "@/components/auth/PlayerAccessGate";
import {
  formatTrainingDate,
  formatTrainingTime,
  loadPlayerVisibleTrainings,
  type PlayerVisibleTraining,
} from "@/lib/player/training-visibility";

export default function PlayerTrainingsPage() {
  const { context } = usePlayerSession();
  const teamId = context.team?.id ?? null;
  const [trainings, setTrainings] = useState<PlayerVisibleTraining[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!teamId) {
        if (active) {
          setTrainings([]);
          setMessage("Не вдалося визначити команду гравця.");
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setMessage(null);

      try {
        const data = await loadPlayerVisibleTrainings(teamId);
        if (!active) return;
        setTrainings(data);
      } catch (error) {
        console.error("Player training visibility error:", error);
        if (!active) return;
        setTrainings([]);
        setMessage("Не вдалося завантажити тренування. Спробуйте ще раз.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [teamId]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
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
            Тут відображаються лише опубліковані тренування вашої команди.
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
            {trainings.map((training, index) => (
              <Link
                key={training.id}
                href={`/player/trainings/${training.id}`}
                className="block rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {index === 0 && (
                        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-sky-800">
                          Найближче
                        </span>
                      )}
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-800">
                        Опубліковано
                      </span>
                    </div>
                    <h2 className="mt-4 text-2xl font-black">{training.title}</h2>
                    <p className="mt-3 capitalize text-slate-600">
                      {formatTrainingDate(training.starts_at)}
                    </p>
                    <p className="mt-1 text-lg font-black text-slate-950">
                      {formatTrainingTime(training.starts_at)} · {training.location}
                    </p>
                  </div>

                  <span className="font-black text-sky-700">Деталі →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
