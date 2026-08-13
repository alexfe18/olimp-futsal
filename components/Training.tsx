"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import AttendanceList from "@/components/training/AttendanceList";
import PlayerIcon from "@/components/training/PlayerIcon";
import TrainingForm from "@/components/training/TrainingForm";
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
import { supabase } from "@/lib/supabase";

type AttendanceBoardViewer = {
  authenticated: boolean;
  profile_id: string | null;
  player_id: string | null;
  player_name: string | null;
  shirt_number: number | null;
  position: string | null;
  can_view_names: boolean;
  can_respond: boolean;
  my_status: AttendanceStatus | null;
  my_updated_at: string | null;
};

type AttendanceBoardCounts = {
  yes: number;
  maybe: number;
  no: number;
  total: number;
  latest_updated_at: string | null;
};

type AttendanceBoardRow = {
  id: string;
  training_id: string;
  player_id: string | null;
  player_name: string;
  status: AttendanceStatus;
  updated_at: string;
};

type AttendanceBoardPayload = {
  viewer: AttendanceBoardViewer;
  counts: AttendanceBoardCounts;
  attendance: AttendanceBoardRow[];
};

const LOGIN_RETURN_STORAGE_KEY = "olimp-player-login-return-to";

const EMPTY_COUNTS: AttendanceBoardCounts = {
  yes: 0,
  maybe: 0,
  no: 0,
  total: 0,
  latest_updated_at: null,
};

function normalizeBoardPayload(value: unknown): AttendanceBoardPayload {
  const raw = (value ?? {}) as Partial<AttendanceBoardPayload>;
  const viewer = (raw.viewer ?? {}) as Partial<AttendanceBoardViewer>;
  const counts = (raw.counts ?? {}) as Partial<AttendanceBoardCounts>;

  return {
    viewer: {
      authenticated: Boolean(viewer.authenticated),
      profile_id: viewer.profile_id ?? null,
      player_id: viewer.player_id ?? null,
      player_name: viewer.player_name ?? null,
      shirt_number:
        typeof viewer.shirt_number === "number" ? viewer.shirt_number : null,
      position: viewer.position ?? null,
      can_view_names: Boolean(viewer.can_view_names),
      can_respond: Boolean(viewer.can_respond),
      my_status:
        viewer.my_status === "yes" ||
        viewer.my_status === "maybe" ||
        viewer.my_status === "no"
          ? viewer.my_status
          : null,
      my_updated_at: viewer.my_updated_at ?? null,
    },
    counts: {
      yes: Number(counts.yes ?? 0),
      maybe: Number(counts.maybe ?? 0),
      no: Number(counts.no ?? 0),
      total: Number(counts.total ?? 0),
      latest_updated_at: counts.latest_updated_at ?? null,
    },
    attendance: Array.isArray(raw.attendance) ? raw.attendance : [],
  };
}

export default function Training({ variant = "section" }: TrainingProps) {
  const isStandalone = variant === "standalone";

  const [training, setTraining] = useState<TrainingRecord | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [boardViewer, setBoardViewer] = useState<AttendanceBoardViewer | null>(
    null,
  );
  const [boardCounts, setBoardCounts] =
    useState<AttendanceBoardCounts>(EMPTY_COUNTS);

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
  const [isLoginGateOpen, setIsLoginGateOpen] = useState(false);

  async function loadAttendanceBoard(trainingId: string) {
    const { data, error } = await supabase.rpc("get_training_attendance_board", {
      p_training_id: trainingId,
    });

    if (error) {
      console.error("Protected attendance board loading error:", error);
      throw new Error("Не вдалося завантажити стан команди.");
    }

    const payload = normalizeBoardPayload(data);

    console.info("[training-board] viewer", {
      authenticated: payload.viewer.authenticated,
      canViewNames: payload.viewer.can_view_names,
      canRespond: payload.viewer.can_respond,
      hasPlayer: Boolean(payload.viewer.player_id),
    });

    setBoardViewer(payload.viewer);
    setBoardCounts(payload.counts);

    const normalizedAttendance: AttendanceRecord[] = payload.attendance.map(
      (record) => ({
        id: record.id,
        trainingId: record.training_id,
        playerId: record.player_id,
        name: record.player_name,
        status: record.status,
        updatedAt: record.updated_at,
      }),
    );

    setAttendance(normalizedAttendance);

    if (payload.viewer.player_id && payload.viewer.player_name) {
      const currentPlayer: PlayerRecord = {
        id: payload.viewer.player_id,
        fullName: payload.viewer.player_name,
        displayName: payload.viewer.player_name,
        shirtNumber: payload.viewer.shirt_number,
        position: payload.viewer.position,
        isActive: true,
      };

      setPlayers([currentPlayer]);
      setSelectedPlayerId(currentPlayer.id);
      setName(currentPlayer.fullName);
      setRememberedName(currentPlayer.fullName);
      setSelectedStatus(payload.viewer.my_status);

      try {
        window.localStorage.setItem(PLAYER_ID_STORAGE_KEY, currentPlayer.id);
        window.localStorage.setItem(
          PLAYER_NAME_STORAGE_KEY,
          currentPlayer.fullName,
        );
      } catch (error) {
        console.warn("Protected board local identity cache warning:", error);
      }
    } else {
      setPlayers([]);
      setSelectedPlayerId("");
      setName("");
      setRememberedName("");
      setSelectedStatus(null);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadTrainingData(showLoader = false) {
      if (showLoader) {
        setIsLoading(true);
      }

      setLoadError("");

      const { data: trainingData, error: trainingError } = await supabase
        .from("trainings")
        .select(
          "id, title, starts_at, location, team_name, status, cancellation_reason",
        )
        .eq("is_active", true)
        .eq("status", "scheduled")
        .order("starts_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!isMounted) return;

      if (trainingError) {
        console.error("Training loading error:", trainingError);
        setTraining(null);
        setAttendance([]);
        setBoardViewer(null);
        setBoardCounts(EMPTY_COUNTS);
        setLoadError("Не вдалося завантажити дані тренування.");
        setIsLoading(false);
        return;
      }

      if (!trainingData) {
        setTraining(null);
        setAttendance([]);
        setBoardViewer(null);
        setBoardCounts(EMPTY_COUNTS);
        setLoadError("Активне тренування поки не додано.");
        setIsLoading(false);
        return;
      }

      const normalizedTraining: TrainingRecord = {
        id: trainingData.id,
        title: trainingData.title,
        startsAt: trainingData.starts_at,
        location: trainingData.location,
        teamName: trainingData.team_name,
        status: trainingData.status,
        cancellationReason: trainingData.cancellation_reason,
      };

      setTraining(normalizedTraining);

      try {
        await loadAttendanceBoard(trainingData.id);
      } catch (error) {
        if (!isMounted) return;
        setAttendance([]);
        setBoardViewer(null);
        setBoardCounts(EMPTY_COUNTS);
        setLoadError(
          error instanceof Error
            ? error.message
            : "Не вдалося завантажити стан команди.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    let authReloadTimer: number | null = null;

    async function bootstrapAuthenticatedBoard() {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (sessionError) {
        console.error("[training-board] session bootstrap error:", sessionError);
      }

      console.info("[training-board] session ready", {
        authenticated: Boolean(session?.user),
        expiresInSeconds: session?.expires_at
          ? session.expires_at - Math.floor(Date.now() / 1000)
          : null,
      });

      await loadTrainingData(true);
    }

    void bootstrapAuthenticatedBoard();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadTrainingData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.info("[training-board] auth event", {
        event,
        authenticated: Boolean(session?.user),
        expiresInSeconds: session?.expires_at
          ? session.expires_at - Math.floor(Date.now() / 1000)
          : null,
      });

      // The initial board load explicitly waits for getSession(), so
      // INITIAL_SESSION must not start a competing Supabase request.
      if (event === "INITIAL_SESSION") return;

      if (authReloadTimer !== null) {
        window.clearTimeout(authReloadTimer);
      }

      // Defer data calls out of the Supabase auth callback.
      authReloadTimer = window.setTimeout(() => {
        if (!isMounted) return;
        void loadTrainingData();
      }, 0);
    });

    const realtimeChannel = supabase
      .channel(
        isStandalone
          ? "olimp-protected-training-page-realtime"
          : "olimp-protected-training-section-realtime",
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trainings" },
        () => {
          void loadTrainingData();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "training_attendance" },
        () => {
          void loadTrainingData();
        },
      )
      .subscribe((status, error) => {
        if (error) {
          console.error("Protected board realtime subscription error:", error);
        }

        if (status === "SUBSCRIBED") {
          console.log("Protected training board realtime connected");
        }
      });

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (authReloadTimer !== null) {
        window.clearTimeout(authReloadTimer);
      }

      authSubscription.unsubscribe();
      void supabase.removeChannel(realtimeChannel);
    };
  }, [isStandalone]);

  const currentPlayerRecord = useMemo(() => {
    if (!selectedPlayerId) return null;

    return (
      attendance.find((record) => record.playerId === selectedPlayerId) ?? null
    );
  }, [attendance, selectedPlayerId]);

  useEffect(() => {
    if (!training || !selectedPlayerId) {
      setSelectedStatus(null);
      return;
    }

    if (currentPlayerRecord) {
      setSelectedStatus(currentPlayerRecord.status);
      return;
    }

    if (boardViewer?.my_status) {
      setSelectedStatus(boardViewer.my_status);
      return;
    }

    try {
      const savedStatus = window.localStorage.getItem(
        getStatusStorageKey(training.id, selectedPlayerId),
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
  }, [training, selectedPlayerId, currentPlayerRecord, boardViewer?.my_status]);

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

  const formattedLatestUpdate = boardCounts.latest_updated_at
    ? new Intl.DateTimeFormat("uk-UA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Kyiv",
      }).format(new Date(boardCounts.latest_updated_at))
    : null;

  const formattedTrainingDate = training
    ? new Intl.DateTimeFormat("uk-UA", {
        day: "numeric",
        month: "long",
        year: "numeric",
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

  const isSubmitDisabled =
    !training ||
    !boardViewer?.can_respond ||
    !selectedPlayerId ||
    !selectedStatus ||
    isSubmitting ||
    isTrainingCancelled ||
    isTrainingCompleted;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!training || !boardViewer?.can_respond || !selectedPlayerId) {
      setFeedback({
        type: "error",
        title: "Потрібна авторизація",
        description: "Увійдіть як гравець команди, щоб зберегти відповідь.",
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
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Authentication required");
      }

      const response = await fetch("/api/attendance/respond", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          trainingId: training.id,
          status: selectedStatus,
        }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        suppressed?: boolean;
        message?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Не вдалося зберегти відповідь.");
      }

      if (result.suppressed) {
        setFeedback({
          type: "success",
          title: "Локальний safe mode",
          description:
            result.message || "Відповідь перевірена, але не записана в базу.",
        });
        return;
      }

      try {
        window.localStorage.setItem(
          getStatusStorageKey(training.id, selectedPlayerId),
          selectedStatus,
        );
      } catch (storageError) {
        console.error("Local storage saving error:", storageError);
      }

      setFeedback(
        getSuccessFeedback(selectedStatus, Boolean(currentPlayerRecord)),
      );

      await loadAttendanceBoard(training.id);
    } catch (error) {
      console.error("Protected attendance submit error:", error);
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
    if (!boardViewer?.can_respond || player.id !== boardViewer.player_id) {
      return;
    }

    setSelectedPlayerId(player.id);
    setName(player.fullName);
    setRememberedName(player.fullName);
    setFeedback(emptyFeedback);
  }

  function handleClearPlayer() {
    if (!boardViewer?.can_respond || !players[0]) return;

    const player = players[0];
    setSelectedPlayerId(player.id);
    setName(player.fullName);
    setRememberedName(player.fullName);
    setFeedback(emptyFeedback);
  }

  function handleStatusSelect(status: AttendanceStatus) {
    setSelectedStatus(status);
    setFeedback(emptyFeedback);
  }

  function rememberTrainingReturn() {
    try {
      window.sessionStorage.setItem(LOGIN_RETURN_STORAGE_KEY, "/training");
    } catch (error) {
      console.warn("Login return target saving warning:", error);
    }
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
              {boardViewer?.can_respond
                ? "Ви увійшли як гравець команди. Відповідь тут синхронізується з вашим кабінетом."
                : "Інформація про тренування та кількість відповідей доступні всім. Імена учасників і голосування — лише гравцям команди після входу."}
            </p>

            {!isStandalone && (
              <Link
                href="/training"
                className="group mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 py-3 font-black text-white transition hover:-translate-y-0.5 hover:bg-sky-500 hover:text-slate-950"
              >
                Відкрити сторінку тренування
                <span aria-hidden="true" className="ml-2">→</span>
              </Link>
            )}

            <div
              className={`overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl ${
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

              <div className={`grid ${isStandalone ? "mt-6 gap-4 sm:grid-cols-4" : "mt-8 gap-5"}`}>
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
                    {isLoading ? "Завантаження..." : (training?.location ?? "—")}
                  </strong>
                </div>
                <div>
                  <span className="block text-sm text-slate-400">Команда</span>
                  <strong className="mt-1 block text-xl">
                    {isLoading ? "Завантаження..." : (training?.teamName ?? "—")}
                  </strong>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-2xl bg-emerald-400/10 px-3 py-4 text-center">
                  <strong className="block text-2xl text-emerald-300">
                    {boardCounts.yes}
                  </strong>
                  <span className="mt-1 block text-xs font-black text-emerald-100">
                    Будуть
                  </span>
                </div>
                <div className="rounded-2xl bg-amber-400/10 px-3 py-4 text-center">
                  <strong className="block text-2xl text-amber-300">
                    {boardCounts.maybe}
                  </strong>
                  <span className="mt-1 block text-xs font-black text-amber-100">
                    Під питанням
                  </span>
                </div>
                <div className="rounded-2xl bg-rose-400/10 px-3 py-4 text-center">
                  <strong className="block text-2xl text-rose-300">
                    {boardCounts.no}
                  </strong>
                  <span className="mt-1 block text-xs font-black text-rose-100">
                    Не будуть
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/[0.06] px-5 py-4">
                <span className="text-sm text-slate-300">Всього відповідей</span>
                <strong className="text-2xl text-sky-400">{boardCounts.total}</strong>
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
            {boardViewer?.can_respond ? (
              <>
                <TrainingForm
                  players={players}
                  selectedPlayerId={selectedPlayerId}
                  rememberedName={rememberedName}
                  currentStatus={currentPlayerRecord?.status ?? boardViewer.my_status}
                  selectedStatus={selectedStatus}
                  feedback={feedback}
                  hasTraining={Boolean(training)}
                  isLoading={isLoading}
                  isSubmitting={isSubmitting}
                  isSubmitDisabled={isSubmitDisabled}
                  onPlayerSelect={handlePlayerSelect}
                  onClearPlayer={handleClearPlayer}
                  onStatusSelect={handleStatusSelect}
                  onSubmit={handleSubmit}
                />

                {boardViewer.can_view_names && (
                  <div className="mt-6 rounded-[2rem] border border-sky-100 bg-sky-50/50 p-4 sm:p-5">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">
                          Team Attendance Board
                        </p>
                        <h2 className="mt-2 text-2xl font-black">
                          Відповіді команди
                        </h2>
                      </div>
                      <p className="text-sm font-bold text-slate-500">
                        Імена бачать лише учасники команди.
                      </p>
                    </div>

                    <AttendanceList
                      groupedAttendance={groupedAttendance}
                      currentPlayerName={name}
                      isLoading={isLoading}
                    />
                  </div>
                )}
              </>
            ) : boardViewer?.authenticated ? (
              <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-xl sm:p-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-2xl font-black text-slate-950">
                  !
                </div>
                <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-amber-800">
                  Потрібна перевірка доступу
                </p>
                <h2 className="mt-3 text-2xl font-black sm:text-3xl">
                  Ви увійшли, але профіль гравця не визначено
                </h2>
                <p className="mt-4 leading-7 text-amber-950">
                  Сесія Futsal OS активна, але для цього тренування не знайдено
                  активного профілю гравця з правом відповіді. Оновіть сторінку.
                  Якщо повідомлення залишиться, перевіримо membership і роль гравця.
                </p>
              </div>
            ) : (
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-2xl text-white">
                  🔒
                </div>
                <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-sky-700">
                  Захищений командний простір
                </p>
                <h2 className="mt-3 text-2xl font-black sm:text-3xl">
                  Склад і голосування доступні гравцям
                </h2>
                <p className="mt-4 leading-7 text-slate-600">
                  Ви можете бачити кількість відповідей. Щоб переглянути імена та відповісти на тренування, увійдіть до Futsal OS як гравець «Олімп Футзал».
                </p>

                <div className="mt-6 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-emerald-50 px-3 py-4 text-center text-emerald-900">
                    <strong className="block text-2xl">{boardCounts.yes}</strong>
                    <span className="text-xs font-black">Будуть</span>
                  </div>
                  <div className="rounded-2xl bg-amber-50 px-3 py-4 text-center text-amber-900">
                    <strong className="block text-2xl">{boardCounts.maybe}</strong>
                    <span className="text-xs font-black">Під питанням</span>
                  </div>
                  <div className="rounded-2xl bg-rose-50 px-3 py-4 text-center text-rose-900">
                    <strong className="block text-2xl">{boardCounts.no}</strong>
                    <span className="text-xs font-black">Не будуть</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsLoginGateOpen(true)}
                  className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-slate-950 px-6 font-black text-white transition hover:bg-sky-500 hover:text-slate-950"
                >
                  Відповісти на тренування →
                </button>
              </div>
            )}
          </div>
        </div>

        {isStandalone && (
          <footer className="mt-8 text-center text-sm text-slate-500">
            «Олімп Футзал» · Миколаїв
          </footer>
        )}
      </div>

      {isLoginGateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="training-login-gate-title"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsLoginGateOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">
              Олімп Футзал
            </p>
            <h2 id="training-login-gate-title" className="mt-3 text-2xl font-black">
              Ви гравець Олімп Футзал?
            </h2>
            <p className="mt-3 leading-7 text-slate-600">
              Після входу ви повернетеся до тренування та зможете проголосувати від свого профілю.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                href="/login?next=/training"
                onClick={rememberTrainingReturn}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-sky-400 px-5 font-black text-slate-950 transition hover:bg-sky-300"
              >
                Так, увійти
              </Link>
              <Link
                href="/"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 px-5 font-black text-slate-700 transition hover:bg-slate-50"
              >
                Ні, на головну
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setIsLoginGateOpen(false)}
              className="mt-4 w-full text-sm font-bold text-slate-500 underline decoration-slate-300 underline-offset-4"
            >
              Залишитися на сторінці
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
