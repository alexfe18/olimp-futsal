"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { usePlayerSession } from "@/components/auth/PlayerAccessGate";
import {
  formatPlayerMatchDate,
  formatPlayerMatchTime,
  getPlayerMatchResult,
  getPlayerMatchStatusLabel,
  getPlayerMatchTitle,
  getPlayerMatchVenueLabel,
  loadPlayerVisibleMatch,
  type PlayerVisibleMatch,
} from "@/lib/player/matches";

export default function PlayerMatchDetailPage() {
  const params = useParams<{ matchId: string }>();
  const { context } = usePlayerSession();

  const teamId = context.team?.id ?? null;
  const matchId = params.matchId;

  const [match, setMatch] = useState<PlayerVisibleMatch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!teamId || !matchId) {
        if (active) {
          setMessage("Матч недоступний.");
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setMessage(null);

      try {
        const data = await loadPlayerVisibleMatch(teamId, matchId);

        if (!active) return;

        setMatch(data);
        if (!data) {
          setMessage("Матч не знайдено або він недоступний вашій команді.");
        }
      } catch (error) {
        console.error("Player match detail loading error:", error);

        if (!active) return;
        setMatch(null);
        setMessage("Не вдалося завантажити матч.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [matchId, teamId]);

  const result = match ? getPlayerMatchResult(match) : null;

  return (
    <main className="min-h-screen bg-slate-50 pb-32 text-slate-950 md:pb-0">
      <section className="bg-slate-950 px-5 py-9 text-white sm:py-11">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/player/matches"
            className="text-sm font-black text-sky-400 hover:text-sky-300"
          >
            ← Усі матчі
          </Link>
          <p className="mt-7 text-xs font-black uppercase tracking-[0.24em] text-violet-300">
            Матч
          </p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">
            Деталі матчу
          </h1>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 py-8 sm:py-10">
        {isLoading && (
          <p className="font-bold text-slate-500">Завантажуємо матч…</p>
        )}

        {!isLoading && message && (
          <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-7 text-rose-900">
            <p className="font-black">{message}</p>
            <Link
              href="/player/matches"
              className="mt-5 inline-flex font-black text-rose-800 underline"
            >
              Повернутися до матчів
            </Link>
          </div>
        )}

        {!isLoading && match && (
          <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-800">
                  {getPlayerMatchStatusLabel(match.status)}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                  {getPlayerMatchVenueLabel(match.venue_type)}
                </span>
                {result && (
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-800">
                    {result}
                  </span>
                )}
              </div>

              <p className="mt-6 text-sm font-bold text-slate-500">
                {match.competition?.name ?? "Змагання не вказано"}
                {match.round_name ? ` · ${match.round_name}` : ""}
              </p>

              <h2 className="mt-2 text-3xl font-black sm:text-4xl">
                {getPlayerMatchTitle(match)}
              </h2>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Дата
                  </p>
                  <p className="mt-2 capitalize font-black">
                    {formatPlayerMatchDate(match.starts_at)}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Час
                  </p>
                  <p className="mt-2 text-xl font-black">
                    {formatPlayerMatchTime(match.starts_at)}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Місце
                  </p>
                  <p className="mt-2 font-black">
                    {match.location ?? "Місце уточнюється"}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-950 p-6 text-white sm:p-8">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Олімп Футзал
                  </p>
                  <p className="mt-2 text-xl font-black">Олімп Футзал</p>
                </div>

                <div className="text-center">
                  {match.status === "completed" &&
                  match.olimp_score !== null &&
                  match.opponent_score !== null ? (
                    <p className="text-4xl font-black">
                      {match.olimp_score} : {match.opponent_score}
                    </p>
                  ) : (
                    <p className="rounded-full bg-white/10 px-4 py-2 text-sm font-black">
                      VS
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Суперник
                  </p>
                  <p className="mt-2 text-xl font-black">
                    {match.opponent?.name ?? "Суперник уточнюється"}
                  </p>
                  {match.opponent?.city && (
                    <p className="mt-1 text-sm text-slate-400">
                      {match.opponent.city}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
