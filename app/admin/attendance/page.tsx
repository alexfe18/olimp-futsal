"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

type TrainingStatus = "scheduled" | "completed" | "cancelled" | string;

type ActualAttendanceStatus = "present" | "absent" | "late" | "excused" | null;

type TrainingRow = {
  id: string;
  title: string;
  starts_at: string;
  location: string;
  is_active: boolean;
  status: TrainingStatus;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
};

type AttendanceRow = {
  id: string;
  training_id: string;
  player_id: string | null;
  player_name: string;
  status: string;
  actual_status: ActualAttendanceStatus;
  coach_note: string | null;
  marked_at: string | null;
  created_at: string;
  updated_at: string;
};

type PlayerRow = {
  id: string;
  full_name: string;
  display_name: string | null;
  shirt_number: number | null;
  position: string | null;
  photo_url: string | null;
  is_active: boolean;
};

type PeriodFilter = "all" | "30" | "90" | "season";
type MarkingFilter = "all" | "marked" | "unmarked";

type TrainingSummary = {
  training: TrainingRow;
  answers: number;
  marked: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  attendancePercent: number | null;
  isPast: boolean;
  isFullyMarked: boolean;
};

type PlayerAttendanceSummary = {
  player: PlayerRow;
  counted: number;
  attended: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  percent: number;
};

const actualStatusLabels: Record<
  Exclude<ActualAttendanceStatus, null>,
  string
> = {
  present: "Був",
  absent: "Не був",
  late: "Запізнився",
  excused: "Поважна причина",
};

function formatTrainingDate(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getPeriodStart(period: PeriodFilter) {
  const now = new Date();

  if (period === "30") {
    now.setDate(now.getDate() - 30);
    return now.getTime();
  }

  if (period === "90") {
    now.setDate(now.getDate() - 90);
    return now.getTime();
  }

  if (period === "season") {
    const currentYear = now.getFullYear();
    const seasonStartYear = now.getMonth() >= 6 ? currentYear : currentYear - 1;

    return new Date(seasonStartYear, 6, 1).getTime();
  }

  return null;
}

function calculateAttendancePercent(
  present: number,
  late: number,
  absent: number,
) {
  const counted = present + late + absent;

  if (!counted) {
    return null;
  }

  return Math.round(((present + late) / counted) * 100);
}

function getAttendanceTone(percent: number | null) {
  if (percent === null) {
    return {
      text: "text-slate-500",
      background: "bg-slate-100",
      bar: "bg-slate-300",
    };
  }

  if (percent >= 90) {
    return {
      text: "text-emerald-700",
      background: "bg-emerald-50",
      bar: "bg-emerald-500",
    };
  }

  if (percent >= 80) {
    return {
      text: "text-lime-700",
      background: "bg-lime-50",
      bar: "bg-lime-500",
    };
  }

  if (percent >= 70) {
    return {
      text: "text-amber-700",
      background: "bg-amber-50",
      bar: "bg-amber-500",
    };
  }

  return {
    text: "text-red-700",
    background: "bg-red-50",
    bar: "bg-red-500",
  };
}

export default function AttendancePage() {
  const [trainings, setTrainings] = useState<TrainingRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [markingFilter, setMarkingFilter] = useState<MarkingFilter>("all");

  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  async function loadData(showLoader = false) {
    if (showLoader) {
      setIsLoading(true);
    }

    const [
      { data: trainingData, error: trainingError },
      { data: attendanceData, error: attendanceError },
      { data: playerData, error: playerError },
    ] = await Promise.all([
      supabase
        .from("trainings")
        .select(
          "id, title, starts_at, location, is_active, status, cancellation_reason, created_at, updated_at",
        )
        .order("starts_at", {
          ascending: false,
        }),

      supabase
        .from("training_attendance")
        .select(
          "id, training_id, player_id, player_name, status, actual_status, coach_note, marked_at, created_at, updated_at",
        ),

      supabase
        .from("players")
        .select(
          "id, full_name, display_name, shirt_number, position, photo_url, is_active",
        )
        .eq("is_active", true)
        .order("display_name", {
          ascending: true,
          nullsFirst: false,
        })
        .order("full_name", {
          ascending: true,
        }),
    ]);

    if (trainingError || attendanceError || playerError) {
      console.error("Attendance page loading error:", {
        trainingError,
        attendanceError,
        playerError,
      });

      setMessage(
        "Не вдалося завантажити тренування, відвідуваність або гравців.",
      );
      setMessageType("error");
      setIsLoading(false);
      return;
    }

    setTrainings((trainingData ?? []) as TrainingRow[]);
    setAttendance((attendanceData ?? []) as AttendanceRow[]);
    setPlayers((playerData ?? []) as PlayerRow[]);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadData(true);

    const channel = supabase
      .channel("olimp-admin-attendance-overview")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trainings",
        },
        () => {
          void loadData();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "training_attendance",
        },
        () => {
          void loadData();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
        },
        () => {
          void loadData();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const attendanceByTraining = useMemo(() => {
    const result = new Map<string, AttendanceRow[]>();

    attendance.forEach((record) => {
      const current = result.get(record.training_id) ?? [];
      current.push(record);
      result.set(record.training_id, current);
    });

    return result;
  }, [attendance]);

  const trainingSummaries = useMemo<TrainingSummary[]>(() => {
    const now = Date.now();

    return trainings.map((training) => {
      const records = attendanceByTraining.get(training.id) ?? [];

      const present = records.filter(
        (record) => record.actual_status === "present",
      ).length;

      const late = records.filter(
        (record) => record.actual_status === "late",
      ).length;

      const absent = records.filter(
        (record) => record.actual_status === "absent",
      ).length;

      const excused = records.filter(
        (record) => record.actual_status === "excused",
      ).length;

      const marked = present + late + absent + excused;
      const attendancePercent = calculateAttendancePercent(
        present,
        late,
        absent,
      );

      return {
        training,
        answers: records.length,
        marked,
        present,
        late,
        absent,
        excused,
        attendancePercent,
        isPast: new Date(training.starts_at).getTime() <= now,
        isFullyMarked: players.length > 0 && marked >= players.length,
      };
    });
  }, [attendanceByTraining, players.length, trainings]);

  const filteredTrainings = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLocaleLowerCase("uk-UA");

    const periodStart = getPeriodStart(periodFilter);

    return trainingSummaries.filter((summary) => {
      if (
        periodStart !== null &&
        new Date(summary.training.starts_at).getTime() < periodStart
      ) {
        return false;
      }

      if (markingFilter === "marked" && summary.marked === 0) {
        return false;
      }

      if (markingFilter === "unmarked" && summary.marked > 0) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableText = [
        summary.training.title,
        summary.training.location,
        formatTrainingDate(summary.training.starts_at),
      ]
        .join(" ")
        .toLocaleLowerCase("uk-UA");

      return searchableText.includes(normalizedSearch);
    });
  }, [markingFilter, periodFilter, searchQuery, trainingSummaries]);

  const overviewStatistics = useMemo(() => {
    const pastTrainings = filteredTrainings.filter(
      (summary) => summary.isPast && summary.training.status !== "cancelled",
    );

    const markedTrainings = pastTrainings.filter(
      (summary) => summary.marked > 0,
    );

    const percentages = markedTrainings
      .map((summary) => summary.attendancePercent)
      .filter((value): value is number => value !== null);

    const average = percentages.length
      ? Math.round(
          percentages.reduce((sum, value) => sum + value, 0) /
            percentages.length,
        )
      : 0;

    const best = percentages.length ? Math.max(...percentages) : 0;

    const totalPresent = markedTrainings.reduce(
      (sum, summary) => sum + summary.present + summary.late,
      0,
    );

    return {
      trainings: pastTrainings.length,
      marked: markedTrainings.length,
      average,
      best,
      totalPresent,
    };
  }, [filteredTrainings]);

  const playerRating = useMemo<PlayerAttendanceSummary[]>(() => {
    const filteredTrainingIds = new Set(
      filteredTrainings
        .filter(
          (summary) =>
            summary.isPast && summary.training.status !== "cancelled",
        )
        .map((summary) => summary.training.id),
    );

    return players
      .map((player) => {
        const records = attendance.filter(
          (record) =>
            record.player_id === player.id &&
            filteredTrainingIds.has(record.training_id) &&
            record.actual_status !== null,
        );

        const present = records.filter(
          (record) => record.actual_status === "present",
        ).length;

        const late = records.filter(
          (record) => record.actual_status === "late",
        ).length;

        const absent = records.filter(
          (record) => record.actual_status === "absent",
        ).length;

        const excused = records.filter(
          (record) => record.actual_status === "excused",
        ).length;

        const counted = present + late + absent;
        const attended = present + late;
        const percent = counted ? Math.round((attended / counted) * 100) : 0;

        return {
          player,
          counted,
          attended,
          present,
          late,
          absent,
          excused,
          percent,
        };
      })
      .filter((summary) => summary.counted > 0)
      .sort((first, second) => {
        if (second.percent !== first.percent) {
          return second.percent - first.percent;
        }

        if (second.attended !== first.attended) {
          return second.attended - first.attended;
        }

        return (
          first.player.display_name ?? first.player.full_name
        ).localeCompare(
          second.player.display_name ?? second.player.full_name,
          "uk",
        );
      });
  }, [attendance, filteredTrainings, players]);

  if (isLoading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="text-center">
          <span className="mx-auto block h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />

          <p className="mt-5 text-sm font-black uppercase tracking-[0.2em] text-sky-700">
            Завантаження відвідуваності...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <section className="rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-9 sm:py-10">
        <p className="text-xs font-black uppercase tracking-[0.26em] text-sky-400">
          Контроль тренувального процесу
        </p>

        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black sm:text-4xl">Відвідуваність</h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
              Порівнюйте попередні відповіді гравців із фактичною присутністю та
              відстежуйте дисципліну команди.
            </p>
          </div>

          <Link
            href="/admin/trainings"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-sky-500 px-6 font-black text-slate-950 transition hover:bg-sky-400"
          >
            Перейти до тренувань
          </Link>
        </div>
      </section>

      {message && (
        <div
          className={`mt-6 rounded-2xl border px-5 py-4 font-bold ${
            messageType === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {message}
        </div>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatisticCard
          label="Тренувань у вибірці"
          value={overviewStatistics.trainings}
          accent="text-sky-600"
        />

        <StatisticCard
          label="Вже відмічено"
          value={overviewStatistics.marked}
          accent="text-slate-800"
        />

        <StatisticCard
          label="Середня відвідуваність"
          value={`${overviewStatistics.average}%`}
          accent="text-emerald-600"
        />

        <StatisticCard
          label="Найкращий показник"
          value={`${overviewStatistics.best}%`}
          accent="text-amber-600"
        />
      </section>

      <section className="mt-10">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-600">
              Історія тренувань
            </p>

            <h2 className="mt-2 text-3xl font-black text-slate-950">
              Фактична присутність
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Пошук тренування"
              className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />

            <select
              value={periodFilter}
              onChange={(event) =>
                setPeriodFilter(event.target.value as PeriodFilter)
              }
              className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-bold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            >
              <option value="all">Усі періоди</option>
              <option value="30">Останні 30 днів</option>
              <option value="90">Останні 90 днів</option>
              <option value="season">Поточний сезон</option>
            </select>

            <select
              value={markingFilter}
              onChange={(event) =>
                setMarkingFilter(event.target.value as MarkingFilter)
              }
              className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-bold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            >
              <option value="all">Усі відмітки</option>
              <option value="marked">Вже відмічені</option>
              <option value="unmarked">Ще не відмічені</option>
            </select>
          </div>
        </div>

        {filteredTrainings.length ? (
          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {filteredTrainings.map((summary) => (
              <TrainingAttendanceCard
                key={summary.training.id}
                summary={summary}
                activePlayers={players.length}
              />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-xl font-black text-slate-800">
              Тренувань за вибраними фільтрами не знайдено
            </p>

            <p className="mt-2 text-slate-500">
              Змініть період, статус відмітки або пошуковий запит.
            </p>
          </div>
        )}
      </section>

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-600">
              Дисципліна команди
            </p>

            <h2 className="mt-2 text-3xl font-black text-slate-950">
              Рейтинг гравців
            </h2>
          </div>

          <p className="text-sm font-semibold text-slate-500">
            Поважна причина не знижує відсоток
          </p>
        </div>

        {playerRating.length ? (
          <div className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="hidden grid-cols-[70px_minmax(260px,1fr)_100px_110px_110px_140px] bg-slate-950 px-6 py-4 text-xs font-black uppercase tracking-[0.13em] text-white lg:grid">
              <span>#</span>
              <span>Гравець</span>
              <span className="text-center">Був</span>
              <span className="text-center">Запізн.</span>
              <span className="text-center">Пропустив</span>
              <span className="text-center">Відсоток</span>
            </div>

            {playerRating.map((summary, index) => (
              <PlayerAttendanceRow
                key={summary.player.id}
                index={index}
                summary={summary}
              />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-xl font-black text-slate-800">
              Рейтинг поки порожній
            </p>

            <p className="mt-2 text-slate-500">
              Він з’явиться після першої фактичної відмітки відвідуваності.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function StatisticCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <article className="rounded-[1.7rem] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{label}</p>

      <strong className={`mt-3 block text-4xl font-black ${accent}`}>
        {value}
      </strong>
    </article>
  );
}

function TrainingAttendanceCard({
  summary,
  activePlayers,
}: {
  summary: TrainingSummary;
  activePlayers: number;
}) {
  const tone = getAttendanceTone(summary.attendancePercent);
  const progress =
    activePlayers > 0
      ? Math.min(100, Math.round((summary.marked / activePlayers) * 100))
      : 0;

  const isCancelled = summary.training.status === "cancelled";

  return (
    <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {summary.training.is_active && (
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-700">
                АКТИВНЕ
              </span>
            )}

            {isCancelled ? (
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
                СКАСОВАНО
              </span>
            ) : summary.isPast ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                МИНУЛО
              </span>
            ) : (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                МАЙБУТНЄ
              </span>
            )}

            {summary.isFullyMarked && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                ВІДМІЧЕНО
              </span>
            )}
          </div>

          <h3 className="mt-4 text-xl font-black text-slate-950">
            {summary.training.title}
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {formatTrainingDate(summary.training.starts_at)}
            {" · "}
            {summary.training.location}
          </p>
        </div>

        <div className={`rounded-2xl px-4 py-3 text-center ${tone.background}`}>
          <span className="block text-xs font-black uppercase tracking-wide text-slate-500">
            Відвідуваність
          </span>

          <strong className={`mt-1 block text-2xl font-black ${tone.text}`}>
            {summary.attendancePercent !== null
              ? `${summary.attendancePercent}%`
              : "—"}
          </strong>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Були" value={summary.present} tone="emerald" />
          <MiniStat label="Запізн." value={summary.late} tone="amber" />
          <MiniStat label="Не були" value={summary.absent} tone="red" />
          <MiniStat label="Поважна" value={summary.excused} tone="sky" />
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-4 text-sm font-bold">
            <span className="text-slate-500">Заповнення відмітки</span>

            <span className="text-slate-800">
              {summary.marked}/{activePlayers}
            </span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-sky-500 transition-all"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-500">
            Попередніх відповідей: {summary.answers}
          </p>

          <Link
            href={`/admin/attendance/${summary.training.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 font-black text-white transition hover:bg-sky-500 hover:text-slate-950"
          >
            {summary.marked > 0
              ? "Переглянути відмітку"
              : "Відмітити присутність"}
          </Link>
        </div>
      </div>
    </article>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "red" | "sky";
}) {
  const styles = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    sky: "bg-sky-50 text-sky-700",
  };

  return (
    <div className={`rounded-2xl p-4 ${styles[tone]}`}>
      <span className="block text-xs font-black uppercase tracking-wide">
        {label}
      </span>

      <strong className="mt-2 block text-2xl font-black">{value}</strong>
    </div>
  );
}

function PlayerAttendanceRow({
  index,
  summary,
}: {
  index: number;
  summary: PlayerAttendanceSummary;
}) {
  const tone = getAttendanceTone(summary.percent);
  const displayName = summary.player.display_name ?? summary.player.full_name;

  return (
    <div className="grid gap-4 border-t border-slate-100 px-5 py-5 first:border-t-0 lg:grid-cols-[70px_minmax(260px,1fr)_100px_110px_110px_140px] lg:items-center lg:px-6">
      <div className="hidden text-xl font-black text-slate-700 lg:block">
        {index + 1}
      </div>

      <div className="flex min-w-0 items-center gap-4">
        {summary.player.photo_url ? (
          <img
            src={summary.player.photo_url}
            alt=""
            className="h-14 w-14 shrink-0 rounded-2xl object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white">
            {displayName.slice(0, 1).toLocaleUpperCase("uk-UA")}
          </div>
        )}

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="truncate text-lg text-slate-950">
              {displayName}
            </strong>

            {summary.player.shirt_number !== null && (
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-black text-sky-700">
                №{summary.player.shirt_number}
              </span>
            )}
          </div>

          <p className="mt-1 truncate text-sm text-slate-500">
            {summary.player.full_name}
          </p>
        </div>
      </div>

      <MobileMetric label="Був" value={summary.present} />
      <MobileMetric label="Запізнився" value={summary.late} />
      <MobileMetric label="Пропустив" value={summary.absent} />

      <div>
        <div className="flex items-center justify-between gap-3 lg:justify-center">
          <span className="text-sm font-bold text-slate-500 lg:hidden">
            Відсоток
          </span>

          <strong className={`text-xl font-black ${tone.text}`}>
            {summary.percent}%
          </strong>
        </div>

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${tone.bar}`}
            style={{
              width: `${summary.percent}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function MobileMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 lg:justify-center">
      <span className="text-sm font-bold text-slate-500 lg:hidden">
        {label}
      </span>

      <strong className="text-lg font-black text-slate-900">{value}</strong>
    </div>
  );
}
