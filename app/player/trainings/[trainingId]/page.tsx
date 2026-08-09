"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { usePlayerSession } from "@/components/auth/PlayerAccessGate";
import {
  formatTrainingDate,
  formatTrainingTime,
  loadPlayerVisibleTraining,
  type PlayerVisibleTraining,
} from "@/lib/player/training-visibility";

export default function PlayerTrainingDetailsPage() {
  const params = useParams<{ trainingId: string }>();
  const { context } = usePlayerSession();
  const teamId = context.team?.id ?? null;
  const trainingId = params.trainingId;
  const [training, setTraining] = useState<PlayerVisibleTraining | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

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

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="bg-slate-950 px-5 py-9 text-white">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/player/trainings"
            className="text-sm font-black text-sky-400 transition hover:text-sky-300"
          >
            ← Усі тренування
          </Link>
          <p className="mt-7 text-xs font-black uppercase tracking-[0.24em] text-sky-400">
            Кабінет гравця
          </p>
          <h1 className="mt-3 text-4xl font-black">Деталі тренування</h1>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-9">
        {isLoading && (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
            <p className="font-bold text-slate-500">Завантажуємо тренування…</p>
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
          <article className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
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

            <div className="mt-8 rounded-2xl border border-sky-100 bg-sky-50 p-5">
              <p className="leading-7 text-sky-950">
                Інформація про тренування Тут відображаються актуальні дата, час і місце проведення тренування. У разі змін інформація буде оновлена тренером.
              </p>
            </div>
          </article>
        )}
      </section>
    </main>
  );
}
