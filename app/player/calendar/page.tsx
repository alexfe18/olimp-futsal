"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { usePlayerSession } from "@/components/auth/PlayerAccessGate";
import {
  createCalendarDateKey,
  createCalendarMonthQueryRange,
  formatCalendarDate,
  formatCalendarDateKey,
  formatCalendarMonthTitle,
  formatCalendarTime,
  getCalendarMonthKey,
  loadPlayerCalendarEvents,
  type PlayerCalendarEvent,
} from "@/lib/player/calendar";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"] as const;

function createVisibleMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getDaysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function getMondayFirstOffset(year: number, monthIndex: number) {
  const sundayFirst = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  return (sundayFirst + 6) % 7;
}

function eventTypeClass(event: PlayerCalendarEvent) {
  return event.sourceType === "match"
    ? "bg-violet-100 text-violet-800"
    : "bg-sky-100 text-sky-800";
}

function eventDotClass(event: PlayerCalendarEvent, selected: boolean) {
  if (event.sourceType === "match") {
    return selected ? "bg-violet-300" : "bg-violet-500";
  }

  return selected ? "bg-sky-300" : "bg-sky-500";
}

export default function PlayerCalendarPage() {
  const { context } = usePlayerSession();
  const teamId = context.team?.id ?? null;

  const agendaRef = useRef<HTMLElement | null>(null);

  const [visibleMonth, setVisibleMonth] = useState(() =>
    createVisibleMonth(new Date()),
  );
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    formatCalendarDateKey(new Date()),
  );
  const [previewEvent, setPreviewEvent] =
    useState<PlayerCalendarEvent | null>(null);
  const [events, setEvents] = useState<PlayerCalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const year = visibleMonth.getFullYear();
  const monthIndex = visibleMonth.getMonth();
  const monthKey = getCalendarMonthKey(year, monthIndex);
  const todayKey = formatCalendarDateKey(new Date());

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
        const data = await loadPlayerCalendarEvents(
          teamId,
          createCalendarMonthQueryRange(year, monthIndex),
        );

        if (!active) return;

        setEvents(data);

        const monthEvents = data.filter((event) =>
          formatCalendarDateKey(event.startsAt).startsWith(monthKey),
        );

        if (!selectedDateKey.startsWith(monthKey)) {
          const preferredKey =
            monthKey === todayKey.slice(0, 7)
              ? todayKey
              : monthEvents[0]
                ? formatCalendarDateKey(monthEvents[0].startsAt)
                : createCalendarDateKey(year, monthIndex, 1);

          setSelectedDateKey(preferredKey);
        }
      } catch (error) {
        console.error("Player calendar loading error:", error);

        if (!active) return;

        setEvents([]);
        setMessage("Не вдалося завантажити календар команди.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [monthIndex, monthKey, selectedDateKey, teamId, todayKey, year]);

  const monthEvents = useMemo(
    () =>
      events.filter((event) =>
        formatCalendarDateKey(event.startsAt).startsWith(monthKey),
      ),
    [events, monthKey],
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, PlayerCalendarEvent[]>();

    for (const event of monthEvents) {
      const key = formatCalendarDateKey(event.startsAt);
      const current = map.get(key) ?? [];
      current.push(event);
      map.set(key, current);
    }

    return map;
  }, [monthEvents]);

  const selectedEvents = eventsByDate.get(selectedDateKey) ?? [];

  const upcomingEvents = useMemo(() => {
    const now = Date.now();

    return monthEvents
      .filter((event) => new Date(event.startsAt).getTime() >= now)
      .slice(0, 6);
  }, [monthEvents]);

  const daysInMonth = getDaysInMonth(year, monthIndex);
  const monthOffset = getMondayFirstOffset(year, monthIndex);

  function moveMonth(offset: number) {
    const next = new Date(year, monthIndex + offset, 1);
    setVisibleMonth(next);
    setSelectedDateKey(
      createCalendarDateKey(next.getFullYear(), next.getMonth(), 1),
    );
    setPreviewEvent(null);
  }

  function showCurrentMonth() {
    const now = new Date();
    setVisibleMonth(createVisibleMonth(now));
    setSelectedDateKey(formatCalendarDateKey(now));
    setPreviewEvent(null);
  }

  function selectDay(dateKey: string) {
    setSelectedDateKey(dateKey);
    setPreviewEvent(null);

    window.setTimeout(() => {
      agendaRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-40 text-slate-950 md:pb-0">
      <section className="bg-slate-950 px-5 py-10 text-white sm:py-12">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-400">
            Календар
          </p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">
            Календар команди
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-300">
            Тренування і матчі в одному календарі — дата, час, місце та швидкий
            перехід до деталей.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-7 px-5 py-8 sm:py-10">
        <section className="overflow-visible rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">
                Місяць
              </p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                {formatCalendarMonthTitle(year, monthIndex)}
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 px-4 font-black transition hover:bg-slate-50"
                aria-label="Попередній місяць"
              >
                ←
              </button>
              <button
                type="button"
                onClick={showCurrentMonth}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 px-4 text-sm font-black transition hover:bg-slate-50"
              >
                Сьогодні
              </button>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 px-4 font-black transition hover:bg-slate-50"
                aria-label="Наступний місяць"
              >
                →
              </button>
            </div>
          </div>

          {isLoading && (
            <div className="p-8">
              <p className="font-bold text-slate-500">
                Завантажуємо календар…
              </p>
            </div>
          )}

          {!isLoading && message && (
            <div className="m-5 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900">
              <p className="font-bold">{message}</p>
            </div>
          )}

          {!isLoading && !message && (
            <div className="p-3 sm:p-5">
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {WEEKDAYS.map((weekday) => (
                  <div
                    key={weekday}
                    className="px-1 py-2 text-center text-[0.65rem] font-black uppercase tracking-wide text-slate-400 sm:text-xs"
                  >
                    {weekday}
                  </div>
                ))}

                {Array.from({ length: monthOffset }).map((_, index) => (
                  <div
                    key={`offset-${index}`}
                    className="min-h-16 rounded-xl bg-slate-50/60 sm:min-h-24"
                    aria-hidden="true"
                  />
                ))}

                {Array.from({ length: daysInMonth }).map((_, index) => {
                  const day = index + 1;
                  const dateKey = createCalendarDateKey(
                    year,
                    monthIndex,
                    day,
                  );
                  const dayEvents = eventsByDate.get(dateKey) ?? [];
                  const selected = selectedDateKey === dateKey;
                  const today = todayKey === dateKey;

                  return (
                    <div
                      key={dateKey}
                      role="button"
                      tabIndex={0}
                      onClick={() => selectDay(dateKey)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          selectDay(dateKey);
                        }
                      }}
                      className={`relative min-h-16 cursor-pointer rounded-xl border p-1.5 text-left transition sm:min-h-24 sm:p-2.5 ${
                        selected
                          ? "border-slate-950 bg-slate-950 text-white"
                          : today
                            ? "border-sky-300 bg-sky-50"
                            : "border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                      aria-label={`Обрати ${dateKey}`}
                    >
                      <span
                        className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full text-sm font-black ${
                          selected
                            ? "bg-white/10 text-white"
                            : today
                              ? "bg-sky-500 text-white"
                              : "text-slate-800"
                        }`}
                      >
                        {day}
                      </span>

                      {dayEvents.length > 0 && (
                        <>
                          <div className="mt-2 flex flex-wrap gap-1 sm:hidden">
                            {dayEvents.slice(0, 4).map((event) => (
                              <button
                                key={event.id}
                                type="button"
                                onClick={(clickEvent) => {
                                  clickEvent.stopPropagation();
                                  setSelectedDateKey(dateKey);
                                  setPreviewEvent(event);
                                }}
                                className={`h-2.5 w-2.5 rounded-full ${eventDotClass(event, selected)}`}
                                aria-label={`${event.typeLabel}: ${event.title}`}
                              />
                            ))}
                          </div>

                          <div className="mt-2 hidden space-y-1 sm:block">
                            {dayEvents.slice(0, 2).map((event) => (
                              <div key={event.id} className="group relative">
                                <button
                                  type="button"
                                  onClick={(clickEvent) => {
                                    clickEvent.stopPropagation();
                                    setSelectedDateKey(dateKey);
                                    setPreviewEvent(event);
                                  }}
                                  className={`block w-full truncate rounded-lg px-2 py-1 text-left text-[0.68rem] font-black ${
                                    event.sourceType === "match"
                                      ? selected
                                        ? "bg-violet-400/20 text-violet-100"
                                        : "bg-violet-100 text-violet-800"
                                      : selected
                                        ? "bg-sky-400/20 text-sky-100"
                                        : "bg-sky-100 text-sky-800"
                                  }`}
                                >
                                  {formatCalendarTime(event.startsAt)} ·{" "}
                                  {event.title}
                                </button>

                                <div className="pointer-events-none absolute bottom-[calc(100%+0.45rem)] left-0 z-30 hidden w-72 rounded-xl bg-slate-950 p-3 text-left text-white shadow-xl group-hover:block group-focus-within:block">
                                  <p className="text-[0.65rem] font-black uppercase tracking-wide text-sky-300">
                                    {event.typeLabel}
                                  </p>
                                  <p className="mt-1 text-sm font-black">
                                    {event.title}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-300">
                                    {formatCalendarTime(event.startsAt)}
                                    {event.location
                                      ? ` · ${event.location}`
                                      : ""}
                                  </p>
                                </div>
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <span
                                className={`block px-1 text-[0.65rem] font-black ${
                                  selected
                                    ? "text-slate-300"
                                    : "text-slate-400"
                                }`}
                              >
                                +{dayEvents.length - 2}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {!isLoading && !message && (
          <section
            ref={agendaRef}
            aria-labelledby="selected-day-events"
            className="scroll-mt-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                  Обраний день
                </p>
                <h2 id="selected-day-events" className="mt-2 text-2xl font-black">
                  Події дня
                </h2>
              </div>
              <span className="text-sm font-bold text-slate-500">
                {selectedDateKey.split("-").reverse().join(".")}
              </span>
            </div>

            {selectedEvents.length === 0 ? (
              <div className="mt-5 rounded-2xl bg-slate-50 p-5">
                <p className="font-bold text-slate-500">
                  На цей день подій немає.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {selectedEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setPreviewEvent(event)}
                    className="group flex w-full flex-col gap-4 rounded-2xl border border-slate-200 p-5 text-left transition hover:border-sky-300 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${eventTypeClass(event)}`}
                        >
                          {event.typeLabel}
                        </span>
                        <span className="font-black">
                          {formatCalendarTime(event.startsAt)}
                        </span>
                      </div>
                      <h3 className="mt-3 text-xl font-black">{event.title}</h3>
                      {event.subtitle && (
                        <p className="mt-1 text-sm font-bold text-slate-500">
                          {event.subtitle}
                        </p>
                      )}
                      {event.location && (
                        <p className="mt-2 text-slate-500">
                          {event.location}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 font-black text-sky-700 transition group-hover:text-sky-500">
                      Переглянути →
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {!isLoading && !message && (
          <section aria-labelledby="upcoming-calendar-events">
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">
                Далі
              </p>
              <h2
                id="upcoming-calendar-events"
                className="mt-2 text-2xl font-black sm:text-3xl"
              >
                Найближчі події місяця
              </h2>
            </div>

            {upcomingEvents.length === 0 ? (
              <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
                <p className="font-bold text-slate-500">
                  У цьому місяці більше немає запланованих подій.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {upcomingEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setPreviewEvent(event)}
                    className="rounded-[1.75rem] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${eventTypeClass(event)}`}
                      >
                        {event.typeLabel}
                      </span>
                      <span className="text-sm font-bold text-slate-500">
                        {formatCalendarDate(event.startsAt)}
                      </span>
                    </div>
                    <h3 className="mt-3 text-xl font-black">{event.title}</h3>
                    <p className="mt-3 font-black">
                      {formatCalendarTime(event.startsAt)}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {previewEvent && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-slate-950/55 p-0 sm:items-center sm:justify-center sm:p-5"
          role="presentation"
          onClick={() => setPreviewEvent(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-event-preview-title"
            onClick={(event) => event.stopPropagation()}
            className="w-full rounded-t-[2rem] bg-white p-6 shadow-2xl sm:max-w-lg sm:rounded-[2rem] sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${eventTypeClass(previewEvent)}`}
                >
                  {previewEvent.typeLabel}
                </span>
                <h2
                  id="calendar-event-preview-title"
                  className="mt-4 text-2xl font-black"
                >
                  {previewEvent.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setPreviewEvent(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 font-black"
                aria-label="Закрити"
              >
                ×
              </button>
            </div>

            <div className="mt-5 space-y-2 text-slate-600">
              <p className="font-bold">{formatCalendarDate(previewEvent.startsAt)}</p>
              <p className="text-lg font-black text-slate-950">
                {formatCalendarTime(previewEvent.startsAt)}
              </p>
              {previewEvent.subtitle && <p>{previewEvent.subtitle}</p>}
              {previewEvent.location && <p>{previewEvent.location}</p>}
            </div>

            <Link
              href={previewEvent.href}
              className="mt-6 flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-5 font-black text-white transition hover:bg-sky-500 hover:text-slate-950"
            >
              Відкрити деталі →
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
