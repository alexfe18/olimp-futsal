"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type AttendanceStatus = "yes" | "maybe" | "no";
type TrainingVariant = "section" | "standalone";

type TrainingProps = {
  variant?: TrainingVariant;
};

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

type FeedbackState = {
  type: "success" | "error" | "";
  title: string;
  description: string;
};

const PLAYER_NAME_STORAGE_KEY = "olimp-player-name";

const emptyFeedback: FeedbackState = {
  type: "",
  title: "",
  description: "",
};

const statusOptions: Array<{
  value: AttendanceStatus;
  label: string;
  groupLabel: string;
  icon: string;
}> = [
  {
    value: "yes",
    label: "Буду",
    groupLabel: "Будуть",
    icon: "✓",
  },
  {
    value: "maybe",
    label: "Під питанням",
    groupLabel: "Під питанням",
    icon: "?",
  },
  {
    value: "no",
    label: "Не буду",
    groupLabel: "Не будуть",
    icon: "×",
  },
];

function normalizePlayerName(playerName: string) {
  return playerName.trim().toLocaleLowerCase("uk");
}

function getStatusStorageKey(trainingId: string, playerName: string) {
  return [
    "olimp-training-status",
    trainingId,
    encodeURIComponent(normalizePlayerName(playerName)),
  ].join("-");
}

function isAttendanceStatus(value: string | null): value is AttendanceStatus {
  return value === "yes" || value === "maybe" || value === "no";
}

function getSuccessFeedback(
  status: AttendanceStatus,
  wasUpdated: boolean,
): FeedbackState {
  const title = wasUpdated ? "Відповідь оновлено!" : "Дякуємо!";

  if (status === "yes") {
    return {
      type: "success",
      title,
      description: "До зустрічі на тренуванні! 💙💛",
    };
  }

  if (status === "maybe") {
    return {
      type: "success",
      title,
      description: "Ваш вибір збережено. Змініть відповідь, коли визначитеся.",
    };
  }

  return {
    type: "success",
    title,
    description: "Дякуємо, що завчасно попередили.",
  };
}

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

export default function Training({ variant = "section" }: TrainingProps) {
  const isStandalone = variant === "standalone";

  const [training, setTraining] = useState<TrainingRecord | null>(null);

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const [name, setName] = useState("");
  const [rememberedName, setRememberedName] = useState("");

  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | null>(
    null,
  );

  const [feedback, setFeedback] = useState<FeedbackState>(emptyFeedback);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    try {
      const savedName = window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY);

      if (savedName?.trim()) {
        setName(savedName);
        setRememberedName(savedName);
      }
    } catch (error) {
      console.error("Player name loading error:", error);
    }
  }, []);

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
        .order("starts_at", {
          ascending: true,
        })
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
        .order("updated_at", {
          ascending: false,
        });

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
      .channel(
        isStandalone
          ? "olimp-training-page-realtime"
          : "olimp-training-section-realtime",
      )
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
  }, [isStandalone]);

  const currentPlayerRecord = useMemo(() => {
    const normalizedName = normalizePlayerName(name);

    if (!normalizedName) {
      return null;
    }

    return (
      attendance.find(
        (record) => normalizePlayerName(record.name) === normalizedName,
      ) ?? null
    );
  }, [attendance, name]);

  useEffect(() => {
    if (!training || !name.trim()) {
      setSelectedStatus(null);
      return;
    }

    if (currentPlayerRecord) {
      setSelectedStatus(currentPlayerRecord.status);
      return;
    }

    try {
      const savedStatus = window.localStorage.getItem(
        getStatusStorageKey(training.id, name),
      );

      if (isAttendanceStatus(savedStatus)) {
        setSelectedStatus(savedStatus);
      } else {
        setSelectedStatus(null);
      }
    } catch (error) {
      console.error("Attendance status loading error:", error);

      setSelectedStatus(null);
    }
  }, [training, name, currentPlayerRecord]);

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
    !training || name.trim().length < 2 || !selectedStatus || isSubmitting;

  async function reloadAttendance(trainingId: string) {
    const { data, error } = await supabase
      .from("training_attendance")
      .select("id, training_id, player_name, status, updated_at")
      .eq("training_id", trainingId)
      .order("updated_at", {
        ascending: false,
      });

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
      setFeedback({
        type: "error",
        title: "Тренування не знайдено",
        description: "Активне тренування поки не додано.",
      });

      return;
    }

    if (normalizedName.length < 2) {
      setFeedback({
        type: "error",
        title: "Перевірте ім’я",
        description: "Ім’я повинно містити щонайменше 2 символи.",
      });

      return;
    }

    if (!selectedStatus) {
      setFeedback({
        type: "error",
        title: "Оберіть відповідь",
        description: "Вкажіть, чи будете ви на тренуванні.",
      });

      return;
    }

    setIsSubmitting(true);
    setFeedback(emptyFeedback);

    try {
      const existingRecord = attendance.find(
        (record) =>
          normalizePlayerName(record.name) ===
          normalizePlayerName(normalizedName),
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
      } else {
        const { error } = await supabase.from("training_attendance").insert({
          training_id: training.id,
          player_name: normalizedName,
          status: selectedStatus,
        });

        if (error) {
          if (error.code === "23505") {
            await reloadAttendance(training.id);

            setFeedback({
              type: "error",
              title: "Ім’я вже є у списку",
              description: "Спробуйте оновити відповідь ще раз.",
            });

            return;
          }

          throw error;
        }
      }

      try {
        window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, normalizedName);

        window.localStorage.setItem(
          getStatusStorageKey(training.id, normalizedName),
          selectedStatus,
        );
      } catch (storageError) {
        console.error("Local storage saving error:", storageError);
      }

      setName(normalizedName);
      setRememberedName(normalizedName);

      setFeedback(getSuccessFeedback(selectedStatus, Boolean(existingRecord)));

      await reloadAttendance(training.id);
    } catch (error) {
      console.error("Attendance submit error:", error);

      setFeedback({
        type: "error",
        title: "Не вдалося зберегти відповідь",
        description: "Перевірте з’єднання з інтернетом та спробуйте ще раз.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNameChange(newName: string) {
    setName(newName);
    setFeedback(emptyFeedback);
  }

  function handleStatusSelect(status: AttendanceStatus) {
    setSelectedStatus(status);
    setFeedback(emptyFeedback);
  }

  return (
    <section
      id={isStandalone ? undefined : "training"}
      className={
        isStandalone
          ? "min-h-screen bg-sky-50 px-4 py-5 text-slate-950 sm:px-6 sm:py-8 lg:px-10"
          : "scroll-mt-24 bg-sky-50 px-6 py-24 text-slate-950 lg:px-10 lg:py-32"
      }
    >
      <div className={isStandalone ? "mx-auto max-w-6xl" : "mx-auto max-w-7xl"}>
        {isStandalone && (
          <header className="mb-6 flex items-center justify-between gap-4 rounded-3xl bg-slate-950 px-4 py-4 text-white shadow-lg sm:px-7 sm:py-5">
            <Link
              href="/"
              aria-label="Перейти на головну сторінку Олімп Футзал"
              className="group flex min-w-0 items-center gap-3 sm:gap-4"
            >
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full transition duration-300 group-hover:scale-105 sm:h-16 sm:w-16">
                <Image
                  src="/images/olimp-logo.png"
                  alt="Логотип СК Олімп Футзал"
                  fill
                  priority
                  sizes="64px"
                  className="object-contain"
                />
              </span>

              <span className="min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-[0.25em] text-sky-300 sm:text-xs">
                  СК Олімп
                </span>

                <span className="mt-1 block truncate text-lg font-black sm:text-2xl">
                  Олімп Футзал
                </span>
              </span>
            </Link>

            <Link
              href="/"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-white/15 px-4 py-2 text-sm font-black transition duration-300 hover:border-sky-400 hover:bg-sky-400 hover:text-slate-950 sm:px-6"
            >
              <span className="hidden sm:inline">На головну</span>

              <span className="sm:hidden">Головна</span>
            </Link>
          </header>
        )}

        <div
          className={`grid ${
            isStandalone
              ? "gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-8"
              : "gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20"
          }`}
        >
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-sky-600">
              Командний простір
            </p>

            <h1
              className={`mt-4 font-black leading-tight tracking-tight ${
                isStandalone
                  ? "text-3xl sm:text-4xl lg:text-5xl"
                  : "text-4xl sm:text-5xl lg:text-6xl"
              }`}
            >
              Найближче тренування
            </h1>

            <p
              className={`max-w-xl leading-8 text-slate-600 ${
                isStandalone ? "mt-4 text-base sm:text-lg" : "mt-6 text-lg"
              }`}
            >
              {isStandalone
                ? "Вкажіть своє ім’я та підтвердьте участь. Повторна відповідь із таким самим ім’ям оновить попередній вибір."
                : "Перегляньте інформацію про найближче тренування та підтвердьте свою участь. Для швидкого голосування відкрийте окрему сторінку тренування."}
            </p>

            {!isStandalone && (
              <Link
                href="/training"
                className="group mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white transition duration-300 hover:-translate-y-0.5 hover:bg-sky-500 hover:text-slate-950"
              >
                Відкрити сторінку тренування
                <span
                  aria-hidden="true"
                  className="ml-2 transition-transform duration-300 group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
            )}

            <div
              className={`overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl transition-shadow duration-300 hover:shadow-2xl ${
                isStandalone ? "mt-6 p-6 sm:p-7" : "mt-10 p-7 sm:p-9"
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-400 text-slate-950 transition-transform duration-300 hover:rotate-3 hover:scale-105">
                  <PlayerIcon />
                </span>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-300">
                    Наступна подія
                  </p>

                  <h2 className="mt-1 text-xl font-black">
                    {isLoading
                      ? "Завантаження..."
                      : (training?.title ?? "Тренування не додано")}
                  </h2>
                </div>
              </div>

              <div
                className={`grid ${
                  isStandalone ? "mt-6 gap-4 sm:grid-cols-3" : "mt-8 gap-5"
                }`}
              >
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

              <div className="mt-6 flex items-center justify-between rounded-2xl bg-white/[0.06] px-5 py-4 transition-colors duration-300 hover:bg-white/[0.1]">
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
              className={`rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-950/5 transition-shadow duration-300 hover:shadow-2xl hover:shadow-sky-950/10 ${
                isStandalone ? "p-5 sm:p-7" : "p-6 sm:p-9"
              }`}
            >
              {rememberedName && (
                <div className="mb-6 rounded-2xl border border-sky-100 bg-sky-50 px-5 py-4">
                  <p className="text-sm font-black text-sky-800">
                    👋 Вітаємо, {rememberedName}!
                  </p>

                  {currentPlayerRecord && (
                    <p className="mt-2 text-sm text-slate-600">
                      Ваш поточний вибір:{" "}
                      <strong className="text-slate-950">
                        {
                          statusOptions.find(
                            (option) =>
                              option.value === currentPlayerRecord.status,
                          )?.label
                        }
                      </strong>
                    </p>
                  )}
                </div>
              )}

              <label
                htmlFor={
                  isStandalone
                    ? "standalone-participant-name"
                    : "participant-name"
                }
                className="text-sm font-black uppercase tracking-[0.18em] text-slate-600"
              >
                Ваше ім’я
              </label>

              <input
                id={
                  isStandalone
                    ? "standalone-participant-name"
                    : "participant-name"
                }
                type="text"
                value={name}
                disabled={!training || isLoading || isSubmitting}
                onChange={(event) => handleNameChange(event.target.value)}
                placeholder="Наприклад, Олександр"
                autoComplete="name"
                minLength={2}
                maxLength={60}
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-base text-slate-950 outline-none transition duration-300 placeholder:text-slate-400 focus:-translate-y-0.5 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <fieldset
                className="mt-7"
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
                        onClick={() => handleStatusSelect(option.value)}
                        aria-pressed={isSelected}
                        className={`min-h-14 rounded-2xl border px-4 py-3 text-sm font-black transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60 ${
                          isSelected
                            ? "scale-[1.03] border-sky-400 bg-sky-400 text-slate-950 shadow-lg shadow-sky-400/25"
                            : "border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50 hover:shadow-md"
                        }`}
                      >
                        <span
                          className={`mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs transition-all duration-300 ${
                            isSelected
                              ? "bg-slate-950 text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {option.icon}
                        </span>

                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="mt-7 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-slate-950 px-7 py-4 text-base font-black text-white transition-all duration-300 enabled:hover:-translate-y-1 enabled:hover:bg-sky-500 enabled:hover:text-slate-950 enabled:hover:shadow-xl enabled:hover:shadow-sky-500/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
              >
                {isSubmitting
                  ? "Збереження..."
                  : currentPlayerRecord
                    ? "Оновити відповідь"
                    : "Підтвердити участь"}
              </button>

              {feedback.type && (
                <div
                  role={feedback.type === "error" ? "alert" : "status"}
                  className={`mt-5 overflow-hidden rounded-2xl border px-5 py-5 transition-all duration-300 ${
                    feedback.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-red-200 bg-red-50 text-red-900"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl font-black ${
                        feedback.type === "success"
                          ? "animate-bounce bg-emerald-500 text-white"
                          : "bg-red-500 text-white"
                      }`}
                    >
                      {feedback.type === "success" ? "✓" : "!"}
                    </span>

                    <div>
                      <p className="font-black">{feedback.title}</p>

                      <p className="mt-1 text-sm leading-6 opacity-80">
                        {feedback.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </form>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {statusOptions.map((option) => {
                const records = groupedAttendance[option.value];

                return (
                  <article
                    key={option.value}
                    className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="font-black text-slate-950">
                        {option.groupLabel}
                      </h3>

                      <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-sky-100 px-3 text-sm font-black text-sky-700 transition-all duration-300">
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
                          {records.map((record) => {
                            const isCurrentPlayer =
                              normalizePlayerName(record.name) ===
                              normalizePlayerName(name);

                            const formattedRecordUpdate =
                              new Intl.DateTimeFormat("uk-UA", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                                timeZone: "Europe/Kyiv",
                              }).format(new Date(record.updatedAt));

                            const recordStatusLabel =
                              statusOptions.find(
                                (statusOption) =>
                                  statusOption.value === record.status,
                              )?.label ?? "—";

                            return (
                              <li
                                key={record.id}
                                aria-label={`Гравець: ${record.name}. Відповідь: ${recordStatusLabel}. Оновлено: ${formattedRecordUpdate}`}
                                tabIndex={0}
                                className={`group/player relative flex cursor-help items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-sky-400 ${
                                  isCurrentPlayer
                                    ? "bg-sky-100 text-sky-900 ring-2 ring-sky-200"
                                    : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                                  <PlayerIcon />
                                </span>

                                <span className="min-w-0 flex-1 truncate">
                                  {record.name}
                                </span>

                                {isCurrentPlayer && (
                                  <span className="ml-auto shrink-0 text-xs font-black uppercase tracking-wide text-sky-700">
                                    Ви
                                  </span>
                                )}

                                <span
                                  role="tooltip"
                                  className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-30 hidden w-max max-w-[260px] -translate-x-1/2 rounded-xl bg-slate-950 px-4 py-3 text-left text-xs font-medium leading-5 text-white shadow-xl group-hover/player:block group-focus-within/player:block"
                                >
                                  <strong className="block text-sm font-black">
                                    {record.name}
                                  </strong>

                                  <span className="mt-1 block text-slate-300">
                                    Відповідь: {recordStatusLabel}
                                  </span>

                                  <span className="block text-slate-400">
                                    Оновлено: {formattedRecordUpdate}
                                  </span>

                                  <span
                                    aria-hidden="true"
                                    className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-950"
                                  />
                                </span>
                              </li>
                            );
                          })}
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

        {isStandalone && (
          <footer className="mt-8 text-center text-sm text-slate-500">
            СК «Олімп Футзал» · Миколаїв
          </footer>
        )}
      </div>
    </section>
  );
}
