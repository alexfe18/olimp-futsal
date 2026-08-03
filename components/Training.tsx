"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import AttendanceList from "@/components/training/AttendanceList";
import TrainingForm from "@/components/training/TrainingForm";
import PlayerIcon from "@/components/training/PlayerIcon";
import {
  emptyFeedback,
  PLAYER_ID_STORAGE_KEY,
  PLAYER_NAME_STORAGE_KEY,
} from "@/components/training/constants";
import type {
  AttendanceRecord,
  AttendanceStatus,
  PlayerRecord,
  TrainingProps,
  TrainingRecord,
} from "@/components/training/types";
import {
  getStatusStorageKey,
  getSuccessFeedback,
  isAttendanceStatus,
  normalizePlayerName,
} from "@/components/training/utils";

export default function Training({ variant = "section" }: TrainingProps) {
  const isStandalone = variant === "standalone";

  const [training, setTraining] = useState<TrainingRecord | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [players, setPlayers] = useState<PlayerRecord[]>([]);

  const [name, setName] = useState("");
  const [rememberedName, setRememberedName] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");

  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | null>(
    null,
  );

  const [feedback, setFeedback] = useState(emptyFeedback);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    try {
      const savedName = window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY);
      const savedPlayerId = window.localStorage.getItem(PLAYER_ID_STORAGE_KEY);

      if (savedName?.trim()) {
        setName(savedName);
        setRememberedName(savedName);
      }

      if (savedPlayerId) {
        setSelectedPlayerId(savedPlayerId);
      }
    } catch (error) {
      console.error("Player data loading error:", error);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadPlayers() {
      const { data, error } = await supabase
        .from("players")
        .select(
          "id, full_name, display_name, shirt_number, position, is_active",
        )
        .eq("is_active", true)
        .order("full_name", {
          ascending: true,
        });

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error("Players loading error:", error);
        setPlayers([]);
        return;
      }

      const normalizedPlayers: PlayerRecord[] = (data ?? []).map((player) => ({
        id: player.id,
        fullName: player.full_name,
        displayName: player.display_name,
        shirtNumber: player.shirt_number,
        position: player.position,
        isActive: player.is_active,
      }));

      setPlayers(normalizedPlayers);

      const savedPlayerId = window.localStorage.getItem(PLAYER_ID_STORAGE_KEY);

      const savedPlayer = normalizedPlayers.find(
        (player) => player.id === savedPlayerId,
      );

      if (savedPlayer) {
        setSelectedPlayerId(savedPlayer.id);
        setName(savedPlayer.fullName);
        setRememberedName(savedPlayer.fullName);
      }
    }

    void loadPlayers();

    return () => {
      isMounted = false;
    };
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
        .select("id, title, starts_at, location, status, cancellation_reason")
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
        status: trainingData.status,
        cancellationReason: trainingData.cancellation_reason,
      };

      setTraining(normalizedTraining);

      const { data: attendanceData, error: attendanceError } = await supabase
        .from("training_attendance")
        .select("id, training_id, player_id, player_name, status, updated_at")
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
        playerId: record.player_id,
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
    if (selectedPlayerId) {
      const byPlayerId = attendance.find(
        (record) => record.playerId === selectedPlayerId,
      );

      if (byPlayerId) {
        return byPlayerId;
      }
    }

    const normalizedName = normalizePlayerName(name);

    if (!normalizedName) {
      return null;
    }

    return (
      attendance.find(
        (record) => normalizePlayerName(record.name) === normalizedName,
      ) ?? null
    );
  }, [attendance, name, selectedPlayerId]);

  useEffect(() => {
    if (!training || (!selectedPlayerId && !name.trim())) {
      setSelectedStatus(null);
      return;
    }

    if (currentPlayerRecord) {
      setSelectedStatus(currentPlayerRecord.status);
      return;
    }

    try {
      const savedStatus = window.localStorage.getItem(
        getStatusStorageKey(training.id, selectedPlayerId || name),
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
  }, [training, name, selectedPlayerId, currentPlayerRecord]);

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

  const isTrainingCancelled = training?.status === "cancelled";
  const isTrainingCompleted = training?.status === "completed";

  useEffect(() => {
    if (isTrainingCancelled || isTrainingCompleted) {
      setFeedback(emptyFeedback);
    }
  }, [isTrainingCancelled, isTrainingCompleted]);

  const isSubmitDisabled =
    !training ||
    !selectedPlayerId ||
    !selectedStatus ||
    isSubmitting ||
    isTrainingCancelled ||
    isTrainingCompleted;

  async function reloadAttendance(trainingId: string) {
    const { data, error } = await supabase
      .from("training_attendance")
      .select("id, training_id, player_id, player_name, status, updated_at")
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
        playerId: record.player_id,
        name: record.player_name,
        status: record.status as AttendanceStatus,
        updatedAt: record.updated_at,
      }),
    );

    setAttendance(normalizedAttendance);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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

    if (isTrainingCancelled) {
      setFeedback({
        type: "error",
        title: "Тренування скасовано",
        description:
          training.cancellationReason || "Голосування для цієї події закрито.",
      });
      return;
    }

    if (isTrainingCompleted) {
      setFeedback({
        type: "error",
        title: "Тренування завершено",
        description: "Голосування для цієї події вже закрито.",
      });
      return;
    }

    if (!selectedPlayerId) {
      setFeedback({
        type: "error",
        title: "Оберіть себе",
        description: "Знайдіть своє ім’я у списку гравців.",
      });
      return;
    }

    if (normalizedName.length < 2) {
      setFeedback({
        type: "error",
        title: "Перевірте ім’я",
        description: "Не вдалося визначити обраного гравця.",
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
          record.playerId === selectedPlayerId ||
          normalizePlayerName(record.name) ===
            normalizePlayerName(normalizedName),
      );

      if (existingRecord) {
        const { error } = await supabase
          .from("training_attendance")
          .update({
            player_id: selectedPlayerId,
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
          player_id: selectedPlayerId,
          player_name: normalizedName,
          status: selectedStatus,
        });

        if (error) {
          if (error.code === "23505") {
            await reloadAttendance(training.id);

            setFeedback({
              type: "error",
              title: "Відповідь уже існує",
              description: "Спробуйте оновити відповідь ще раз.",
            });

            return;
          }

          throw error;
        }
      }

      try {
        window.localStorage.setItem(PLAYER_ID_STORAGE_KEY, selectedPlayerId);
        window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, normalizedName);

        window.localStorage.setItem(
          getStatusStorageKey(training.id, selectedPlayerId),
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

  function handlePlayerSelect(player: PlayerRecord) {
    setSelectedPlayerId(player.id);
    setName(player.fullName);
    setRememberedName(player.fullName);
    setFeedback(emptyFeedback);

    try {
      window.localStorage.setItem(PLAYER_ID_STORAGE_KEY, player.id);
      window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, player.fullName);
    } catch (error) {
      console.error("Player saving error:", error);
    }
  }

  function handleClearPlayer() {
    setSelectedPlayerId("");
    setName("");
    setRememberedName("");
    setSelectedStatus(null);
    setFeedback(emptyFeedback);

    try {
      window.localStorage.removeItem(PLAYER_ID_STORAGE_KEY);
      window.localStorage.removeItem(PLAYER_NAME_STORAGE_KEY);
    } catch (error) {
      console.error("Player clearing error:", error);
    }
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
          <header className="mb-6 flex items-center justify-between gap-4 rounded-3xl bg-slate-950 px-4 py-4 text-white shadow-xl sm:px-7">
            <Link
              href="/"
              aria-label="Перейти на головну сторінку Олімп Футзал"
              className="group flex min-w-0 items-center gap-3 sm:gap-4"
            >
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full transition duration-300 group-hover:scale-105">
                <Image
                  src="/images/olimp-logo.png"
                  alt="Логотип Олімп Футзал"
                  fill
                  priority
                  sizes="64px"
                  className="object-contain"
                />
              </span>

              <span className="min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-[0.25em] text-sky-300 sm:text-xs">
                  Разом до Вершин
                </span>

                <span className="mt-1 block truncate text-lg font-black sm:text-2xl">
                  Олімп Футзал
                </span>
              </span>
            </Link>

            <Link
              href="/"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-white/15 px-4 py-2 text-sm font-black transition hover:border-sky-400 hover:text-sky-300 sm:px-6"
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
                ? "Оберіть себе у списку гравців та підтвердьте участь. Наступного разу ваш профіль буде вибрано автоматично."
                : "Перегляньте інформацію про найближче тренування та підтвердьте свою участь. Для швидкого голосування відкрийте окрему сторінку."}
            </p>

            {!isStandalone && (
              <Link
                href="/training"
                className="group mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 py-3 font-black text-white transition hover:-translate-y-0.5 hover:bg-sky-500 hover:text-slate-950"
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
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-400 text-slate-950">
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

              {isTrainingCancelled && (
                <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4">
                  <p className="font-black text-red-200">
                    Тренування скасовано
                  </p>

                  {training?.cancellationReason && (
                    <p className="mt-2 text-sm leading-6 text-red-100">
                      Причина: {training.cancellationReason}
                    </p>
                  )}
                </div>
              )}

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

              <div className="mt-6 flex items-center justify-between rounded-2xl bg-white/[0.06] px-5 py-4">
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
            <TrainingForm
              players={players}
              selectedPlayerId={selectedPlayerId}
              rememberedName={rememberedName}
              currentStatus={currentPlayerRecord?.status ?? null}
              selectedStatus={selectedStatus}
              feedback={feedback}
              hasTraining={
                Boolean(training) &&
                !isTrainingCancelled &&
                !isTrainingCompleted
              }
              isLoading={isLoading}
              isSubmitting={isSubmitting}
              isSubmitDisabled={isSubmitDisabled}
              onPlayerSelect={handlePlayerSelect}
              onClearPlayer={handleClearPlayer}
              onStatusSelect={handleStatusSelect}
              onSubmit={handleSubmit}
            />

            <AttendanceList
              groupedAttendance={groupedAttendance}
              currentPlayerName={name}
              isLoading={isLoading}
            />
          </div>
        </div>

        {isStandalone && (
          <footer className="mt-8 text-center text-sm text-slate-500">
            «Олімп Футзал» · Миколаїв
          </footer>
        )}
      </div>
    </section>
  );
}
