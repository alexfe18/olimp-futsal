"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { usePlayerSession } from "@/components/auth/PlayerAccessGate";
import {
  formatCalendarDate,
  formatCalendarTime,
  loadPlayerUpcomingCalendarEvents,
  type PlayerCalendarEvent,
} from "@/lib/player/calendar";

export default function PlayerHomePage() {
  const { context } = usePlayerSession();
  const teamId = context.team?.id ?? null;

  const [events, setEvents] = useState<PlayerCalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const returnTo = window.sessionStorage.getItem(
        "olimp-player-login-return-to",
      );

      if (returnTo === "/training") {
        window.sessionStorage.removeItem("olimp-player-login-return-to");
        window.location.replace(returnTo);
      }
    } catch (error) {
      console.warn("Player login return redirect warning:", error);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!teamId) {
        if (active) {
          setEvents([]);
          setMessage("Не вдалося визначити команду гравця.");
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setMessage(null);

      try {
        const data = await loadPlayerUpcomingCalendarEvents(teamId);
        if (!active) return;
        setEvents(data);
      } catch (error) {
        console.error("Player dashboard calendar loading error:", error);
        if (!active) return;
        setEvents([]);
        setMessage("Не вдалося завантажити найближчі події.");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [teamId]);

  const nearestEvent = events[0] ?? null;
  const nextEvents = useMemo(() => events.slice(1, 4), [events]);

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-950 md:pb-0">
      <section className="bg-slate-950 px-5 py-10 text-white sm:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div className="min-w-0">
              <h1 className="truncate text-4xl font-black sm:text-5xl">
                {context.display_name}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-bold">
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-slate-200">
                  {context.team?.name ?? "Олімп Футзал"}
                </span>

                {context.player?.sporting_is_active === false && (
                  <span className="rounded-full bg-amber-400/15 px-3 py-1.5 text-amber-200">
                    Спортивний статус: неактивний
                  </span>
                )}
              </div>
            </div>

            <Link
              href="/player/calendar"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-sky-400 px-6 font-black text-slate-950 transition hover:bg-sky-300"
            >
              Календар →
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:py-10">
        <section aria-labelledby="nearest-event-heading">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">
                Найближча подія
              </p>
              <h2
                id="nearest-event-heading"
                className="mt-2 text-2xl font-black sm:text-3xl"
              >
                Наступна подія
              </h2>
            </div>
          </div>

          {isLoading && (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
              <p className="font-bold text-slate-500">
                Завантажуємо найближчу подію…
              </p>
            </div>
          )}

          {!isLoading && message && (
            <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-7">
              <p className="font-bold text-rose-900">{message}</p>
            </div>
          )}

          {!isLoading && !message && !nearestEvent && (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
              <span className="text-3xl" aria-hidden="true">
                📅
              </span>
              <h3 className="mt-4 text-xl font-black">
                Найближчих подій поки немає
              </h3>
              <p className="mt-2 max-w-2xl leading-7 text-slate-600">
                Коли з’явиться наступна подія команди, дата, час і місце
                автоматично з’являться у кабінеті.
              </p>
            </div>
          )}

          {!isLoading && !message && nearestEvent && (
            <Link
              href={nearestEvent.href}
              className="group block rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl sm:p-8"
            >
              <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-sky-800">
                      Найближче
                    </span>
                    <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-sky-800">
                      {nearestEvent.typeLabel}
                    </span>
                  </div>

                  <h3 className="mt-5 text-2xl font-black sm:text-3xl">
                    {nearestEvent.title}
                  </h3>
                  <p className="mt-3 capitalize text-base font-bold text-slate-600">
                    {formatCalendarDate(nearestEvent.startsAt)}
                  </p>
                  <p className="mt-2 text-lg font-black text-slate-950">
                    {formatCalendarTime(nearestEvent.startsAt)}
                    {nearestEvent.location
                      ? ` · ${nearestEvent.location}`
                      : ""}
                  </p>
                </div>

                <span className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-slate-950 px-6 font-black text-white transition group-hover:bg-sky-600">
                  Деталі →
                </span>
              </div>
            </Link>
          )}
        </section>

        {!isLoading && !message && nextEvents.length > 0 && (
          <section aria-labelledby="next-events-heading">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                  Далі
                </p>
                <h2
                  id="next-events-heading"
                  className="mt-2 text-2xl font-black"
                >
                  Наступні події
                </h2>
              </div>

              <Link
                href="/player/calendar"
                className="text-sm font-black text-sky-700 transition hover:text-sky-500"
              >
                Відкрити календар →
              </Link>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {nextEvents.map((event) => (
                <Link
                  key={event.id}
                  href={event.href}
                  className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <p className="capitalize text-sm font-bold text-slate-500">
                    {formatCalendarDate(event.startsAt)}
                  </p>
                  <h3 className="mt-3 text-xl font-black">{event.title}</h3>
                  <p className="mt-3 font-black">
                    {formatCalendarTime(event.startsAt)}
                    {event.location ? ` · ${event.location}` : ""}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="quick-actions-heading">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
            Швидкий доступ
          </p>
          <h2 id="quick-actions-heading" className="mt-2 text-2xl font-black">
            Мій простір
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Link
              href="/player/calendar"
              className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="text-3xl" aria-hidden="true">
                🗓️
              </span>
              <h3 className="mt-4 text-xl font-black">Календар</h3>
              <p className="mt-2 leading-7 text-slate-600">
                Усі найближчі події команди за датами в одному календарі.
              </p>
            </Link>

            <Link
              href="/player/trainings"
              className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="text-3xl" aria-hidden="true">
                📅
              </span>
              <h3 className="mt-4 text-xl font-black">Тренування</h3>
              <p className="mt-2 leading-7 text-slate-600">
                Дати, час, місце та ваші відповіді на опубліковані тренування.
              </p>
            </Link>

            <Link
              href="/player/matches"
              className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="text-3xl" aria-hidden="true">
                ⚽
              </span>
              <h3 className="mt-4 text-xl font-black">Матчі</h3>
              <p className="mt-2 leading-7 text-slate-600">
                Найближчі матчі, суперники, турніри та результати.
              </p>
            </Link>

            <Link
              href="/player/profile"
              className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="text-3xl" aria-hidden="true">
                👤
              </span>
              <h3 className="mt-4 text-xl font-black">Мій профіль</h3>
              <p className="mt-2 leading-7 text-slate-600">
                Номер, позиція, команда, спортивний статус та дані облікового запису.
              </p>
            </Link>

            {context.can_access_admin && (
              <Link
                href="/admin"
                className="rounded-[2rem] border border-slate-900 bg-slate-950 p-6 text-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <span className="text-3xl" aria-hidden="true">
                  ⚙️
                </span>
                <h3 className="mt-4 text-xl font-black">
                  Адміністративна панель
                </h3>
                <p className="mt-2 leading-7 text-slate-300">
                  Перейти до адміністративних інструментів вашої додаткової ролі.
                </p>
              </Link>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
