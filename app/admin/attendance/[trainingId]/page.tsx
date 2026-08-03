"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

type ActualAttendanceStatus = "present" | "absent" | "late" | "excused" | null;

type TrainingRow = {
  id: string;
  title: string;
  starts_at: string;
  location: string;
  is_active: boolean;
  status: string;
  cancellation_reason: string | null;
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

type AttendanceRow = {
  id: string;
  training_id: string;
  player_id: string | null;
  player_name: string;
  status: string;
  actual_status: ActualAttendanceStatus;
  coach_note: string | null;
  marked_at: string | null;
};

type AttendanceEditorRow = {
  player: PlayerRow;
  attendanceId: string | null;
  responseStatus: string | null;
  actualStatus: ActualAttendanceStatus;
  coachNote: string;
  markedAt: string | null;
};

const statusOptions: Array<{
  value: Exclude<ActualAttendanceStatus, null>;
  label: string;
  shortLabel: string;
  className: string;
}> = [
  {
    value: "present",
    label: "Був",
    shortLabel: "Був",
    className: "border-emerald-300 bg-emerald-50 text-emerald-700",
  },
  {
    value: "late",
    label: "Запізнився",
    shortLabel: "Запізнився",
    className: "border-amber-300 bg-amber-50 text-amber-700",
  },
  {
    value: "absent",
    label: "Не був",
    shortLabel: "Не був",
    className: "border-red-300 bg-red-50 text-red-700",
  },
  {
    value: "excused",
    label: "Поважна причина",
    shortLabel: "Поважна",
    className: "border-sky-300 bg-sky-50 text-sky-700",
  },
];

function formatTrainingDate(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Kyiv",
  }).format(new Date(value));
}

function getResponseLabel(status: string | null) {
  if (status === "yes") {
    return {
      label: "Буде",
      className: "bg-emerald-100 text-emerald-700",
    };
  }

  if (status === "no") {
    return {
      label: "Не буде",
      className: "bg-red-100 text-red-700",
    };
  }

  return {
    label: "Не голосував",
    className: "bg-slate-100 text-slate-600",
  };
}

function getDisplayName(player: PlayerRow) {
  return player.display_name?.trim() || player.full_name;
}

export default function TrainingAttendanceDetailsPage() {
  const params = useParams<{ trainingId: string }>();
  const trainingId = params.trainingId;

  const [training, setTraining] = useState<TrainingRow | null>(null);
  const [rows, setRows] = useState<AttendanceEditorRow[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [onlyUnmarked, setOnlyUnmarked] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  async function loadData(showLoader = false) {
    if (showLoader) {
      setIsLoading(true);
    }

    const [
      { data: trainingData, error: trainingError },
      { data: playerData, error: playerError },
      { data: attendanceData, error: attendanceError },
    ] = await Promise.all([
      supabase
        .from("trainings")
        .select(
          "id, title, starts_at, location, is_active, status, cancellation_reason",
        )
        .eq("id", trainingId)
        .single(),

      supabase
        .from("players")
        .select(
          "id, full_name, display_name, shirt_number, position, photo_url, is_active",
        )
        .eq("is_active", true)
        .order("shirt_number", {
          ascending: true,
          nullsFirst: false,
        })
        .order("display_name", {
          ascending: true,
          nullsFirst: false,
        })
        .order("full_name", {
          ascending: true,
        }),

      supabase
        .from("training_attendance")
        .select(
          "id, training_id, player_id, player_name, status, actual_status, coach_note, marked_at",
        )
        .eq("training_id", trainingId),
    ]);

    if (trainingError || playerError || attendanceError) {
      console.error("Attendance details loading error:", {
        trainingError,
        playerError,
        attendanceError,
      });

      setMessage("Не вдалося завантажити тренування або список гравців.");
      setMessageType("error");
      setIsLoading(false);
      return;
    }

    const attendanceByPlayerId = new Map(
      ((attendanceData ?? []) as AttendanceRow[])
        .filter((record) => record.player_id)
        .map((record) => [record.player_id as string, record]),
    );

    setTraining(trainingData as TrainingRow);

    setRows(
      ((playerData ?? []) as PlayerRow[]).map((player) => {
        const record = attendanceByPlayerId.get(player.id);

        return {
          player,
          attendanceId: record?.id ?? null,
          responseStatus: record?.status ?? null,
          actualStatus: record?.actual_status ?? null,
          coachNote: record?.coach_note ?? "",
          markedAt: record?.marked_at ?? null,
        };
      }),
    );

    setIsLoading(false);
  }

  useEffect(() => {
    void loadData(true);
  }, [trainingId]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLocaleLowerCase("uk-UA");

    return rows.filter((row) => {
      if (onlyUnmarked && row.actualStatus !== null) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableText = [
        row.player.full_name,
        row.player.display_name ?? "",
        row.player.position ?? "",
        String(row.player.shirt_number ?? ""),
      ]
        .join(" ")
        .toLocaleLowerCase("uk-UA");

      return searchableText.includes(normalizedSearch);
    });
  }, [onlyUnmarked, rows, searchQuery]);

  const summary = useMemo(() => {
    const present = rows.filter((row) => row.actualStatus === "present").length;

    const late = rows.filter((row) => row.actualStatus === "late").length;

    const absent = rows.filter((row) => row.actualStatus === "absent").length;

    const excused = rows.filter((row) => row.actualStatus === "excused").length;

    return {
      total: rows.length,
      marked: present + late + absent + excused,
      present,
      late,
      absent,
      excused,
    };
  }, [rows]);

  function updateRow(
    playerId: string,
    update: Partial<Pick<AttendanceEditorRow, "actualStatus" | "coachNote">>,
  ) {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.player.id === playerId
          ? {
              ...row,
              ...update,
            }
          : row,
      ),
    );
  }

  function applyStatusToAll(status: Exclude<ActualAttendanceStatus, null>) {
    setRows((currentRows) =>
      currentRows.map((row) => ({
        ...row,
        actualStatus: status,
      })),
    );
  }

  function clearAllStatuses() {
    setRows((currentRows) =>
      currentRows.map((row) => ({
        ...row,
        actualStatus: null,
      })),
    );
  }

  function useVotingAnswers() {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.responseStatus === "yes") {
          return {
            ...row,
            actualStatus: "present",
          };
        }

        if (row.responseStatus === "no") {
          return {
            ...row,
            actualStatus: "absent",
          };
        }

        return row;
      }),
    );
  }

  async function saveAttendance() {
    if (!training) {
      return;
    }

    setIsSaving(true);
    setMessage("");
    setMessageType("");

    try {
      const now = new Date().toISOString();

      const payload = rows.map((row) => {
        const responseStatus =
          row.responseStatus === "yes" ||
          row.responseStatus === "maybe" ||
          row.responseStatus === "no"
            ? row.responseStatus
            : "no_response";

        const hasActualData =
          row.actualStatus !== null || row.coachNote.trim().length > 0;

        return {
          training_id: training.id,
          player_id: row.player.id,
          player_name: getDisplayName(row.player),
          status: responseStatus,
          actual_status: row.actualStatus,
          coach_note: row.coachNote.trim() || null,
          marked_at: hasActualData ? now : null,
          updated_at: now,
        };
      });

      const { error } = await supabase
        .from("training_attendance")
        .upsert(payload, {
          onConflict: "training_id,player_id",
        });

      if (error) {
        console.error("Supabase attendance upsert error:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });

        throw new Error(error.message);
      }

      await loadData();

      setMessage(
        `Відвідуваність збережено: ${summary.marked} із ${summary.total} гравців відмічено.`,
      );
      setMessageType("success");
    } catch (error) {
      console.error("Attendance saving error:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Не вдалося зберегти відвідуваність.",
      );
      setMessageType("error");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="text-center">
          <span className="mx-auto block h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />

          <p className="mt-5 text-sm font-black uppercase tracking-[0.2em] text-sky-700">
            Завантаження складу...
          </p>
        </div>
      </div>
    );
  }

  if (!training) {
    return (
      <div className="rounded-[2rem] border border-red-200 bg-red-50 p-8">
        <h1 className="text-2xl font-black text-red-800">
          Тренування не знайдено
        </h1>

        <Link
          href="/admin/attendance"
          className="mt-5 inline-flex rounded-full bg-slate-950 px-6 py-3 font-black text-white"
        >
          ← До відвідуваності
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-32">
      <section className="rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-9 sm:py-10">
        <Link
          href="/admin/attendance"
          className="text-sm font-bold text-sky-400 transition hover:text-sky-300"
        >
          ← Відвідуваність
        </Link>

        <p className="mt-6 text-xs font-black uppercase tracking-[0.24em] text-sky-400">
          Фактична відмітка
        </p>

        <h1 className="mt-3 text-3xl font-black sm:text-4xl">
          {training.title}
        </h1>

        <p className="mt-4 text-slate-300">
          {formatTrainingDate(training.starts_at)}
          {" · "}
          {training.location}
        </p>

        {training.status === "cancelled" && (
          <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4 text-red-100">
            <strong>Тренування скасовано.</strong>

            {training.cancellation_reason && (
              <p className="mt-1">Причина: {training.cancellation_reason}</p>
            )}
          </div>
        )}
      </section>

      {message && (
        <div
          role={messageType === "error" ? "alert" : "status"}
          className={`mt-6 rounded-2xl border px-5 py-4 font-bold ${
            messageType === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Відмічено"
          value={`${summary.marked}/${summary.total}`}
          className="text-sky-600"
        />

        <SummaryCard
          label="Були"
          value={summary.present}
          className="text-emerald-600"
        />

        <SummaryCard
          label="Запізнилися"
          value={summary.late}
          className="text-amber-600"
        />

        <SummaryCard
          label="Не були"
          value={summary.absent}
          className="text-red-500"
        />

        <SummaryCard
          label="Поважна причина"
          value={summary.excused}
          className="text-sky-700"
        />
      </section>

      <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-600">
              Швидкі дії
            </p>

            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Заповнення складу
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <QuickButton onClick={useVotingAnswers}>Із голосування</QuickButton>

            <QuickButton onClick={() => applyStatusToAll("present")}>
              Усім «Був»
            </QuickButton>

            <QuickButton onClick={() => applyStatusToAll("absent")}>
              Усім «Не був»
            </QuickButton>

            <QuickButton onClick={clearAllStatuses}>Очистити</QuickButton>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-500">
          «Із голосування» переносить відповіді «Буде» в статус «Був», а «Не
          буде» — у «Не був». Після цього можна вручну виправити фактичні дані.
        </p>
      </section>

      <section className="mt-10">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-600">
              Активний склад
            </p>

            <h2 className="mt-2 text-3xl font-black text-slate-950">Гравці</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Пошук гравця"
              className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />

            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 font-bold">
              <input
                type="checkbox"
                checked={onlyUnmarked}
                onChange={(event) => setOnlyUnmarked(event.target.checked)}
                className="h-5 w-5 accent-sky-500"
              />
              Лише без відмітки
            </label>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {filteredRows.map((row) => (
            <PlayerAttendanceCard
              key={row.player.id}
              row={row}
              onStatusChange={(status) =>
                updateRow(row.player.id, {
                  actualStatus: status,
                })
              }
              onNoteChange={(note) =>
                updateRow(row.player.id, {
                  coachNote: note,
                })
              }
            />
          ))}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-4 shadow-[0_-12px_35px_rgba(15,23,42,0.12)] backdrop-blur lg:left-[280px]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={isSaving || training.status === "cancelled"}
            onClick={() => void saveAttendance()}
            className="inline-flex min-h-14 flex-1 items-center justify-center rounded-full bg-slate-950 px-7 font-black text-white transition enabled:hover:bg-sky-500 enabled:hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving
              ? "Збереження..."
              : `Зберегти відвідуваність (${summary.marked}/${summary.total})`}
          </button>

          <Link
            href="/admin/attendance"
            className="inline-flex min-h-14 items-center justify-center rounded-full border border-slate-300 px-7 font-black text-slate-700 transition hover:bg-slate-100"
          >
            Повернутися
          </Link>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number | string;
  className: string;
}) {
  return (
    <article className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{label}</p>

      <strong className={`mt-3 block text-3xl font-black ${className}`}>
        {value}
      </strong>
    </article>
  );
}

function QuickButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 px-5 text-sm font-black text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
    >
      {children}
    </button>
  );
}

function PlayerAttendanceCard({
  row,
  onStatusChange,
  onNoteChange,
}: {
  row: AttendanceEditorRow;
  onStatusChange: (status: ActualAttendanceStatus) => void;
  onNoteChange: (note: string) => void;
}) {
  const displayName = getDisplayName(row.player);
  const response = getResponseLabel(row.responseStatus);

  return (
    <article
      className={`rounded-[2rem] border bg-white p-5 shadow-sm transition sm:p-6 ${
        row.actualStatus ? "border-sky-200" : "border-slate-200"
      }`}
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        <div className="flex min-w-0 items-center gap-4 xl:w-[270px] xl:shrink-0">
          {row.player.photo_url ? (
            <img
              src={row.player.photo_url}
              alt=""
              className="h-16 w-16 shrink-0 rounded-2xl object-cover object-top"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white">
              {displayName.slice(0, 1).toLocaleUpperCase("uk-UA")}
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="truncate text-lg text-slate-950">
                {displayName}
              </strong>

              {row.player.shirt_number !== null && (
                <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-black text-sky-700">
                  №{row.player.shirt_number}
                </span>
              )}
            </div>

            <p className="mt-1 text-sm text-slate-500">
              {row.player.position ?? "Позиція не вказана"}
            </p>

            <span
              className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${response.className}`}
            >
              Голосування: {response.label}
            </span>
          </div>
        </div>

        <div className="flex-1">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {statusOptions.map((option) => {
              const isSelected = row.actualStatus === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    onStatusChange(isSelected ? null : option.value)
                  }
                  className={`min-h-12 rounded-2xl border px-3 py-3 text-sm font-black transition ${
                    isSelected
                      ? option.className
                      : "border-slate-200 bg-slate-50 text-slate-500 hover:border-sky-200 hover:bg-sky-50"
                  }`}
                >
                  {option.shortLabel}
                </button>
              );
            })}
          </div>

          <label className="mt-4 block">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              Коментар тренера
            </span>

            <input
              type="text"
              value={row.coachNote}
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder="Необов’язковий коментар"
              className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
            />
          </label>
        </div>
      </div>
    </article>
  );
}
