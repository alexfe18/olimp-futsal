"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { usePlayerSession } from "@/components/auth/PlayerAccessGate";
import {
  formatPlayerMatchDate,
  formatPlayerMatchTime,
  getPlayerMatchResult,
  getPlayerMatchStatusLabel,
  getPlayerMatchTitle,
  getPlayerMatchVenueLabel,
  loadPlayerVisibleMatches,
  type PlayerVisibleMatch,
} from "@/lib/player/matches";

function MatchCard({ match }: { match: PlayerVisibleMatch }) {
  const result = getPlayerMatchResult(match);

  return (
    <Link
      href={`/player/matches/${match.id}`}
      className="block rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-800">
          Матч
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
          {getPlayerMatchStatusLabel(match.status)}
        </span>
        {result && (
          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-800">
            {result}
          </span>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-500">
            {match.competition?.name ?? "Змагання не вказано"}
            {match.round_name ? ` · ${match.round_name}` : ""}
          </p>

          <h2 className="mt-2 text-2xl font-black">
            {getPlayerMatchTitle(match)}
          </h2>

          <p className="mt-3 capitalize font-bold text-slate-600">
            {formatPlayerMatchDate(match.starts_at)}
          </p>

          <p className="mt-1 text-lg font-black">
            {formatPlayerMatchTime(match.starts_at)}
            {match.location ? ` · ${match.location}` : ""}
          </p>

          <p className="mt-2 text-sm font-bold text-slate-500">
            {getPlayerMatchVenueLabel(match.venue_type)}
          </p>
        </div>

        {match.status === "completed" &&
          match.olimp_score !== null &&
          match.opponent_score !== null && (
            <div className="shrink-0 rounded-2xl bg-slate-950 px-5 py-4 text-center text-white">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Рахунок
              </p>
              <p className="mt-1 text-3xl font-black">
                {match.olimp_score} : {match.opponent_score}
              </p>
            </div>
          )}
      </div>
    </Link>
  );
}

export default function PlayerMatchesPage() {
  const { context } = usePlayerSession();
  const teamId = context.team?.id ?? null;

  const [matches, setMatches] = useState<PlayerVisibleMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!teamId) {
        if (active) {
          setMessage("Не вдалося визначити команду гравця.");
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setMessage(null);

      try {
        const data = await loadPlayerVisibleMatches(teamId);

        if (!active) return;
        setMatches(data);
      } catch (error) {
        console.error("Player matches loading error:", error);

        if (!active) return;
        setMatches([]);
        setMessage("Не вдалося завантажити матчі команди.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [teamId]);

  const upcoming = useMemo(() => {
    const now = Date.now();

    return matches
      .filter(
        (match) =>
          match.status === "scheduled" &&
          match.starts_at !== null &&
          new Date(match.starts_at).getTime() >= now,
      )
      .sort(
        (a, b) =>
          new Date(a.starts_at ?? 0).getTime() -
          new Date(b.starts_at ?? 0).getTime(),
      );
  }, [matches]);

  const history = useMemo(
    () =>
      matches
        .filter((match) => match.status === "completed")
        .sort(
          (a, b) =>
            new Date(b.starts_at ?? 0).getTime() -
            new Date(a.starts_at ?? 0).getTime(),
        ),
    [matches],
  );

  return (
    <main className="min-h-screen bg-slate-50 pb-32 text-slate-950 md:pb-0">
      <section className="bg-slate-950 px-5 py-10 text-white sm:py-12">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-300">
            Матчі
          </p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">
            Матчі команди
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-300">
            Найближчі і завершені матчі, суперник, турнір, місце та результат.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-10 px-5 py-8 sm:py-10">
        {isLoading && (
          <p className="font-bold text-slate-500">Завантажуємо матчі…</p>
        )}

        {!isLoading && message && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 font-bold text-rose-900">
            {message}
          </div>
        )}

        {!isLoading && !message && (
          <>
            <section aria-labelledby="upcoming-matches-heading">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-700">
                Далі
              </p>
              <h2
                id="upcoming-matches-heading"
                className="mt-2 text-3xl font-black"
              >
                Найближчі матчі
              </h2>

              {upcoming.length === 0 ? (
                <div className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
                  <p className="font-bold text-slate-500">
                    Найближчих матчів поки немає.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {upcoming.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              )}
            </section>

            <section aria-labelledby="match-history-heading">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                Історія
              </p>
              <h2
                id="match-history-heading"
                className="mt-2 text-3xl font-black"
              >
                Завершені матчі
              </h2>

              {history.length === 0 ? (
                <div className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
                  <p className="font-bold text-slate-500">
                    Історія матчів поки порожня.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {history.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
