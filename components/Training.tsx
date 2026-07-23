"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type AttendanceStatus = "yes" | "maybe" | "no";

type TrainingRecord = {
  id: string;
  title: string;
  startsAt: string;
  location: string;
};

type AttendanceRecord = {
  id: string;
  trainingId: string;
  name: string;
  status: AttendanceStatus;
  updatedAt: string;
};

const statusOptions: Array<{
  value: AttendanceStatus;
  label: string;
  groupLabel: string;
}> = [
  {
    value: "yes",
    label: "Буду",
    groupLabel: "Будуть",
  },
  {
    value: "maybe",
    label: "Під питанням",
    groupLabel: "Під питанням",
  },
  {
    value: "no",
    label: "Не буду",
    groupLabel: "Не будуть",
  },
];

function PlayerIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none" aria-hidden="true">
      <circle cx="15" cy="7" r="4" fill="currentColor" />

      <path
        d="M12 12.5L17 11L21 15.5L25 14"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M16.5 12L14 19L9 24"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M14 19L20 22L22 27"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle cx="26" cy="24" r="4" stroke="currentColor" strokeWidth="2" />

      <path d="M24 22.5L26 21L28 22.5L27.3 25L24.7 25Z" fill="currentColor" />
    </svg>
  );
}

export default function Training() {
  const [training, setTraining] = useState<TrainingRecord | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const [name, setName] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | null>(
    null,
  );

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadTrainingData(showLoader = false) {
      if (showLoader) {
        setIsLoading(true);
      }

      setLoadError("");

      const { data: trainingData, error: trainingError } = await supabase
        .from("trainings")
        .select("id, title, starts_at, location")
        .eq("is_active", true)
        .order("starts_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (trainingError) {
        console.error("Training loading error:", trainingError);
        setLoadError("Не вдалося завантажити дані тренування.");
        setIsLoading(false);
        return;
      }

      if (!trainingData) {
        setTraining(null);
        setAttendance([]);
        setLoadError("Активне тренування поки не додано.");
        setIsLoading(false);
        return;
      }

      const normalizedTraining: TrainingRecord = {
        id: trainingData.id,
        title: trainingData.title,
        startsAt: trainingData.starts_at,
        location: trainingData.location,
      };

      setTraining(normalizedTraining);

      const { data: attendanceData, error: attendanceError } = await supabase
        .from("training_attendance")
        .select("id, training_id, player_name, status, updated_at")
        .eq("training_id", trainingData.id)
        .order("updated_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (attendanceError) {
        console.error("Attendance loading error:", attendanceError);

        setLoadError("Не вдалося завантажити відповіді учасників.");
        setAttendance([]);
        setIsLoading(false);
        return;
      }

      const normalizedAttendance: AttendanceRecord[] = (
        attendanceData ?? []
      ).map((record) => ({
        id: record.id,
        trainingId: record.training_id,
        name: record.player_name,
        status: record.status as AttendanceStatus,
        updatedAt: record.updated_at,
      }));

      setAttendance(normalizedAttendance);
      setIsLoading(false);
    }

    void loadTrainingData(true);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadTrainingData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const realtimeChannel = supabase
      .channel("olimp-training-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trainings",
        },
        () => {
          void loadTrainingData();
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
          void loadTrainingData();
        },
      )
      .subscribe((status, error) => {
        if (error) {
          console.error("Realtime subscription error:", error);
        }

        if (status === "SUBSCRIBED") {
          console.log("Supabase Realtime connected");
        }
      });

    return () => {
      isMounted = false;

      document.removeEventListener("visibilitychange", handleVisibilityChange);

      void supabase.removeChannel(realtimeChannel);
    };
  }, []);

  const groupedAttendance = useMemo(() => {
    const sortByName = (records: AttendanceRecord[]) =>
      [...records].sort((first, second) =>
        first.name.localeCompare(second.name, "uk"),
      );

    return {
      yes: sortByName(attendance.filter((record) => record.status === "yes")),
      maybe: sortByName(
        attendance.filter((record) => record.status === "maybe"),
      ),
      no: sortByName(attendance.filter((record) => record.status === "no")),
    };
  }, [attendance]);

  const latestUpdate = useMemo(() => {
    if (!attendance.length) {
      return null;
    }

    return [...attendance].sort(
      (first, second) =>
        new Date(second.updatedAt).getTime() -
        new Date(first.updatedAt).getTime(),
    )[0].updatedAt;
  }, [attendance]);

  const formattedLatestUpdate = latestUpdate
    ? new Intl.DateTimeFormat("uk-UA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Kyiv",
      }).format(new Date(latestUpdate))
    : null;

  const formattedTrainingDate = training
    ? new Intl.DateTimeFormat("uk-UA", {
        day: "numeric",
        month: "long",
        timeZone: "Europe/Kyiv",
      }).format(new Date(training.startsAt))
    : "—";

  const formattedTrainingTime = training
    ? new Intl.DateTimeFormat("uk-UA", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Europe/Kyiv",
      }).format(new Date(training.startsAt))
    : "—";

  const isSubmitDisabled =
    !training || !name.trim() || !selectedStatus || isSubmitting;

  async function reloadAttendance(trainingId: string) {
    const { data, error } = await supabase
      .from("training_attendance")
      .select("id, training_id, player_name, status, updated_at")
      .eq("training_id", trainingId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Attendance refresh error:", error);
      throw new Error("Не вдалося оновити список учасників.");
    }

    const normalizedAttendance: AttendanceRecord[] = (data ?? []).map(
      (record) => ({
        id: record.id,
        trainingId: record.training_id,
        name: record.player_name,
        status: record.status as AttendanceStatus,
        updatedAt: record.updated_at,
      }),
    );

    setAttendance(normalizedAttendance);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = name.trim();

    if (!training) {
      setMessage("Активне тренування не знайдено.");
      return;
    }

    if (normalizedName.length < 2) {
      setMessage("Ім’я повинно містити щонайменше 2 символи.");
      return;
    }

    if (!selectedStatus) {
      setMessage("Оберіть варіант участі.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const existingRecord = attendance.find(
        (record) =>
          record.name.toLocaleLowerCase("uk") ===
          normalizedName.toLocaleLowerCase("uk"),
      );

      if (existingRecord) {
        const { error } = await supabase
          .from("training_attendance")
          .update({
            player_name: normalizedName,
            status: selectedStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingRecord.id)
          .eq("training_id", training.id);

        if (error) {
          throw error;
        }

        setMessage("Вашу відповідь оновлено.");
      } else {
        const { error } = await supabase.from("training_attendance").insert({
          training_id: training.id,
          player_name: normalizedName,
          status: selectedStatus,
        });

        if (error) {
          if (error.code === "23505") {
            await reloadAttendance(training.id);

            setMessage(
              "Таке ім’я вже є у списку. Спробуйте оновити відповідь ще раз.",
            );

            return;
          }

          throw error;
        }

        setMessage("Вашу відповідь збережено.");
      }

      /*
       * Realtime обновит все открытые страницы.
       * Локально перечитываем данные сразу, чтобы пользователь
       * моментально увидел результат даже при задержке подключения.
       */
      await reloadAttendance(training.id);

      setName("");
      setSelectedStatus(null);
    } catch (error) {
      console.error("Attendance submit error:", error);

      setMessage("Не вдалося зберегти відповідь. Спробуйте ще раз.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      id="training"
      className="scroll-mt-24 bg-sky-50 px-6 py-24 text-slate-950 lg:px-10 lg:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-sky-600">
              Командний простір
            </p>

            <h2 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Найближче тренування
            </h2>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Вкажіть своє ім’я та підтвердьте участь. Повторна відповідь із
              таким самим ім’ям оновить попередній вибір.
            </p>

            <div className="mt-10 overflow-hidden rounded-3xl bg-slate-950 p-7 text-white shadow-xl sm:p-9">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-400 text-slate-950">
                  <PlayerIcon />
                </span>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-300">
                    Наступна подія
                  </p>

                  <h3 className="mt-1 text-xl font-black">
                    {isLoading
                      ? "Завантаження..."
                      : (training?.title ?? "Тренування не додано")}
                  </h3>
                </div>
              </div>

              <div className="mt-8 grid gap-5">
                <div>
                  <span className="block text-sm text-slate-400">Дата</span>

                  <strong className="mt-1 block text-xl capitalize">
                    {isLoading ? "Завантаження..." : formattedTrainingDate}
                  </strong>
                </div>

                <div>
                  <span className="block text-sm text-slate-400">Час</span>

                  <strong className="mt-1 block text-xl">
                    {isLoading ? "Завантаження..." : formattedTrainingTime}
                  </strong>
                </div>

                <div>
                  <span className="block text-sm text-slate-400">Місце</span>

                  <strong className="mt-1 block text-xl">
                    {isLoading
                      ? "Завантаження..."
                      : (training?.location ?? "—")}
                  </strong>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between rounded-2xl bg-white/[0.06] px-5 py-4">
                <span className="text-sm text-slate-300">Уже відповіли</span>

                <strong className="text-2xl text-sky-400">
                  {attendance.length}
                </strong>
              </div>

              {formattedLatestUpdate && (
                <p className="mt-4 text-sm text-slate-400">
                  Останнє оновлення: {formattedLatestUpdate}
                </p>
              )}

              {loadError && (
                <p className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
                  {loadError}
                </p>
              )}
            </div>
          </div>

          <div>
            <form
              onSubmit={handleSubmit}
              className="rounded-[2rem] border border-sky-100 bg-white p-6 shadow-xl shadow-sky-950/5 sm:p-9"
            >
              <label
                htmlFor="participant-name"
                className="text-sm font-black uppercase tracking-[0.18em] text-slate-600"
              >
                Ваше ім’я
              </label>

              <input
                id="participant-name"
                type="text"
                value={name}
                disabled={!training || isLoading || isSubmitting}
                onChange={(event) => {
                  setName(event.target.value);
                  setMessage("");
                }}
                placeholder="Наприклад, Олександр"
                autoComplete="name"
                minLength={2}
                maxLength={60}
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <fieldset
                className="mt-8"
                disabled={!training || isLoading || isSubmitting}
              >
                <legend className="text-sm font-black uppercase tracking-[0.18em] text-slate-600">
                  Ваша відповідь
                </legend>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {statusOptions.map((option) => {
                    const isSelected = selectedStatus === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setSelectedStatus(option.value);
                          setMessage("");
                        }}
                        aria-pressed={isSelected}
                        className={`min-h-14 rounded-2xl border px-4 py-3 text-sm font-black transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                          isSelected
                            ? "scale-[1.02] border-sky-400 bg-sky-400 text-slate-950 shadow-lg shadow-sky-400/20"
                            : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="mt-7 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-slate-950 px-7 py-4 text-base font-black text-white transition duration-300 enabled:hover:-translate-y-0.5 enabled:hover:bg-sky-500 enabled:hover:text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
              >
                {isSubmitting ? "Збереження..." : "Підтвердити участь"}
              </button>

              {message && (
                <p
                  role="status"
                  className="mt-4 rounded-2xl bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800"
                >
                  {message}
                </p>
              )}
            </form>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {statusOptions.map((option) => {
                const records = groupedAttendance[option.value];

                return (
                  <article
                    key={option.value}
                    className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="font-black text-slate-950">
                        {option.groupLabel}
                      </h3>

                      <span
                        key={records.length}
                        className="flex h-9 min-w-9 items-center justify-center rounded-full bg-sky-100 px-3 text-sm font-black text-sky-700"
                      >
                        {records.length}
                      </span>
                    </div>

                    <div className="mt-5">
                      {isLoading ? (
                        <p className="text-sm leading-6 text-slate-400">
                          Завантаження...
                        </p>
                      ) : records.length > 0 ? (
                        <ul className="space-y-3">
                          {records.map((record) => (
                            <li
                              key={record.id}
                              className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700"
                            >
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                                <PlayerIcon />
                              </span>

                              <span className="min-w-0 truncate">
                                {record.name}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm leading-6 text-slate-400">
                          Відповідей поки немає.
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
