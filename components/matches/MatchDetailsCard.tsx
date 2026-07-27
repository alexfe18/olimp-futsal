"use client";

import Link from "next/link";

export type MatchDetailsPlayerEvent = {
  playerId: string;
  playerName: string;
  value: number;
};

export type MatchDetailsData = {
  matchId: string;
  opponentName: string;
  olimpScore: number | null;
  opponentScore: number | null;
  roundName: string | null;
  formattedDate: string;
  status: string;
  scorers: MatchDetailsPlayerEvent[];
  assistants: MatchDetailsPlayerEvent[];
  yellowCards: MatchDetailsPlayerEvent[];
  redCards: MatchDetailsPlayerEvent[];
  ownGoals: MatchDetailsPlayerEvent[];
  mvpName: string | null;
};

type MatchDetailsCardProps = {
  details: MatchDetailsData;
  showEditAction?: boolean;
  onClose?: () => void;
};

const statusLabels: Record<string, string> = {
  scheduled: "Заплановано",
  completed: "Завершено",
  postponed: "Перенесено",
  cancelled: "Скасовано",
};

export default function MatchDetailsCard({
  details,
  showEditAction = true,
  onClose,
}: MatchDetailsCardProps) {
  const hasScore =
    details.olimpScore !== null && details.opponentScore !== null;

  return (
    <article className="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-2xl">
      <header className="border-b border-white/10 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-400">
              Деталі матчу
            </p>

            <p className="mt-2 text-sm font-semibold text-slate-400">
              {details.roundName ?? "Матч"} · {details.formattedDate}
            </p>
          </div>

          <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-200">
            {statusLabels[details.status] ?? details.status}
          </span>
        </div>

        <div className="mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
          <strong className="text-right text-lg sm:text-2xl">
            Олімп Футзал
          </strong>

          <span className="rounded-2xl bg-white/10 px-5 py-4 text-3xl font-black tabular-nums sm:px-7 sm:text-4xl">
            {hasScore
              ? `${details.olimpScore} : ${details.opponentScore}`
              : "—"}
          </span>

          <strong className="text-left text-lg sm:text-2xl">
            {details.opponentName}
          </strong>
        </div>
      </header>

      <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
        <EventCard
          icon="⚽"
          title="Голи"
          items={details.scorers}
          emptyText="Голи не вказані"
        />

        <EventCard
          icon="🎯"
          title="Асисти"
          items={details.assistants}
          emptyText="Асисти не вказані"
        />

        <EventCard
          icon="🟨"
          title="Жовті картки"
          items={details.yellowCards}
          emptyText="Жовтих карток немає"
        />

        <EventCard
          icon="🟥"
          title="Червоні картки"
          items={details.redCards}
          emptyText="Червоних карток немає"
        />

        <EventCard
          icon="🥅"
          title="Автоголи"
          items={details.ownGoals}
          emptyText="Автоголів немає"
        />

        <section className="rounded-3xl bg-white/5 p-5">
          <h3 className="font-black">⭐ MVP</h3>

          <p className="mt-4 text-slate-300">
            {details.mvpName ?? "MVP ще не обрано"}
          </p>
        </section>
      </div>

      {(showEditAction || onClose) && (
        <footer className="flex flex-col gap-3 border-t border-white/10 p-5 sm:flex-row sm:justify-end sm:p-6">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 px-6 font-black text-white transition hover:bg-white/10"
            >
              Закрити
            </button>
          )}

          {showEditAction && (
            <Link
              href={`/admin/matches/${details.matchId}/statistics`}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-sky-500 px-6 font-black text-slate-950 transition hover:bg-sky-400"
            >
              Редагувати статистику
            </Link>
          )}
        </footer>
      )}
    </article>
  );
}

function EventCard({
  icon,
  title,
  items,
  emptyText,
}: {
  icon: string;
  title: string;
  items: MatchDetailsPlayerEvent[];
  emptyText: string;
}) {
  return (
    <section className="rounded-3xl bg-white/5 p-5">
      <h3 className="font-black">
        {icon} {title}
      </h3>

      {items.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li
              key={`${title}-${item.playerId}`}
              className="flex items-center justify-between gap-4 text-slate-200"
            >
              <span className="min-w-0 truncate">{item.playerName}</span>

              <strong className="shrink-0 tabular-nums">{item.value}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-slate-400">{emptyText}</p>
      )}
    </section>
  );
}
