"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import { sendTrainingNotification } from "./training-notification-service";

type TrainingStatus = "scheduled" | "cancelled" | "completed";

type TrainingRow = {
  id: string;
  title: string;
  starts_at: string;
  location: string;
  team_name: string | null;
  is_active: boolean;
  status: TrainingStatus;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
};

type AttendanceRow = {
  training_id: string;
};

type LinkedPlanSummary = {
  id: string;
  title: string;
  objective: string | null;
  planned_duration: number;
  status: string;
  team_name: string | null;
  training_id: string;
  training_plan_blocks: { id: string }[];
};

type TrainingForm = {
  id: string | null;
  title: string;
  date: string;
  time: string;
  location: string;
  teamName: string;
  activateAfterSaving: boolean;
  linkedPlanId: string | null;
};

const emptyTrainingForm: TrainingForm = {
  id: null,
  title: "Командне тренування",
  date: "",
  time: "19:00",
  location: "ФОК Олімп",
  teamName: "Дорослі",
  activateAfterSaving: false,
  linkedPlanId: null,
};

function getDateInputValue(isoDate: string) {
  const date = new Date(isoDate);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTimeInputValue(isoDate: string) {
  const date = new Date(isoDate);

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function formatTrainingDate(isoDate: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Kyiv",
  }).format(new Date(isoDate));
}

function formatTrainingTime(isoDate: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Kyiv",
  }).format(new Date(isoDate));
}

function getStatusLabel(status: TrainingStatus) {
  if (status === "cancelled") {
    return "Скасовано";
  }

  if (status === "completed") {
    return "Завершено";
  }

  return "Заплановано";
}

function getPlanStatusLabel(status: string) {
  if (status === "published") return "Опубліковано";
  if (status === "completed") return "Завершено";
  if (status === "cancelled") return "Скасовано";
  if (status === "planned") return "Заплановано";
  return "Чернетка";
}

function LinkedPlanSummaryCard({ plan }: { plan: LinkedPlanSummary }) {
  return (
    <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">
          Пов’язаний план тренування
        </p>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-sky-700">
          {getPlanStatusLabel(plan.status)}
        </span>
      </div>
      <p className="mt-3 font-black">{plan.title}</p>
      {plan.objective ? (
        <p className="mt-2 text-sm leading-6 text-slate-600">{plan.objective}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
        <span className="rounded-full bg-white px-3 py-1">
          {plan.planned_duration} хв
        </span>
        <span className="rounded-full bg-white px-3 py-1">
          {plan.training_plan_blocks.length} блоків
        </span>
        {plan.team_name ? (
          <span className="rounded-full bg-white px-3 py-1">
            {plan.team_name}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Вправи, порядок блоків і тренерські нотатки редагуються у конструкторі плану.
      </p>
    </div>
  );
}

export default function AdminTrainingsPage() {
  const router = useRouter();

  const [adminEmail, setAdminEmail] = useState("");

  const [trainings, setTrainings] = useState<TrainingRow[]>([]);

  const [attendanceCounts, setAttendanceCounts] = useState<
    Record<string, number>
  >({});

  const [linkedPlansByTrainingId, setLinkedPlansByTrainingId] = useState<
    Record<string, LinkedPlanSummary>
  >({});

  const [form, setForm] = useState<TrainingForm>(emptyTrainingForm);

  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const [message, setMessage] = useState("");

  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const [isLoading, setIsLoading] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [processingTrainingId, setProcessingTrainingId] = useState<
    string | null
  >(null);

  async function loadAdminData(showLoader = false) {
    if (showLoader) {
      setIsLoading(true);
    }

    const { data: trainingData, error: trainingError } = await supabase
      .from("trainings")
      .select(
        "id, title, starts_at, location, team_name, is_active, status, cancellation_reason, created_at, updated_at",
      )
      .order("starts_at", {
        ascending: false,
      });

    if (trainingError) {
      console.error("Trainings loading error:", trainingError);

      setMessage("Не вдалося завантажити список тренувань.");
      setMessageType("error");
      setIsLoading(false);
      return;
    }

    const [
      { data: attendanceData, error: attendanceError },
      { data: planData, error: planError },
    ] = await Promise.all([
      supabase.from("training_attendance").select("training_id"),
      supabase
        .from("training_plans")
        .select(
          "id, title, objective, planned_duration, status, team_name, training_id, training_plan_blocks(id)",
        )
        .not("training_id", "is", null),
    ]);

    if (attendanceError || planError) {
      console.error("Training relations loading error:", {
        attendanceError,
        planError,
      });

      setMessage(
        "Не вдалося завантажити статистику або пов’язані плани тренувань.",
      );
      setMessageType("error");
      setIsLoading(false);
      return;
    }

    const counts = ((attendanceData ?? []) as AttendanceRow[]).reduce<
      Record<string, number>
    >((result, record) => {
      result[record.training_id] = (result[record.training_id] ?? 0) + 1;

      return result;
    }, {});

    const linkedPlans = ((planData ?? []) as LinkedPlanSummary[]).reduce<
      Record<string, LinkedPlanSummary>
    >((result, plan) => {
      if (plan.training_id) {
        result[plan.training_id] = plan;
      }
      return result;
    }, {});

    setTrainings((trainingData ?? []) as TrainingRow[]);
    setAttendanceCounts(counts);
    setLinkedPlansByTrainingId(linkedPlans);
    setIsLoading(false);
  }

  useEffect(() => {
    let isMounted = true;

    async function initializeAdmin() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error || !session) {
        router.replace("/admin/login");
        return;
      }

      setAdminEmail(session.user.email ?? "");

      await loadAdminData(true);
    }

    void initializeAdmin();

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        router.replace("/admin/login");
      }
    });

    const realtimeChannel = supabase
      .channel("olimp-admin-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trainings",
        },
        () => {
          void loadAdminData();
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
          void loadAdminData();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "training_plans",
        },
        () => {
          void loadAdminData();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "training_plan_blocks",
        },
        () => {
          void loadAdminData();
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      authSubscription.unsubscribe();

      void supabase.removeChannel(realtimeChannel);
    };
  }, [router]);

  const activeTraining = useMemo(
    () => trainings.find((training) => training.is_active) ?? null,
    [trainings],
  );

  const totalAnswers = useMemo(
    () =>
      Object.values(attendanceCounts).reduce(
        (total, count) => total + count,
        0,
      ),
    [attendanceCounts],
  );

  useEffect(() => {
    if (isLoading || typeof window === "undefined") return;

    const targetId = window.location.hash.slice(1);
    if (!targetId.startsWith("training-")) return;

    const frameId = window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isLoading, trainings]);

  function openCreateForm() {
    setForm(emptyTrainingForm);
    setIsEditorOpen(true);
    setMessage("");
    setMessageType("");
  }

  function openEditForm(training: TrainingRow) {
    const linkedPlan = linkedPlansByTrainingId[training.id] ?? null;

    setForm({
      id: training.id,
      title: linkedPlan?.title ?? training.title,
      date: getDateInputValue(training.starts_at),
      time: getTimeInputValue(training.starts_at),
      location: training.location,
      teamName: training.team_name ?? linkedPlan?.team_name ?? "",
      activateAfterSaving: training.is_active,
      linkedPlanId: linkedPlan?.id ?? null,
    });

    setIsEditorOpen(true);
    setMessage("");
    setMessageType("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function closeEditor() {
    if (isSaving) {
      return;
    }

    setIsEditorOpen(false);
    setForm(emptyTrainingForm);
  }

  async function trySendNotification(
    trainingId: string,
    eventType: "published" | "updated" | "cancelled" | "restored",
    context?: {
      previousStartsAt?: string | null;
      previousLocation?: string | null;
      previousTeamName?: string | null;
    },
  ) {
    try {
      await sendTrainingNotification(trainingId, eventType, context);
      return "";
    } catch (error) {
      console.error("Training Push notification error:", error);
      return " Дані збережено, але Push-сповіщення не надіслано.";
    }
  }

  async function activateTraining(trainingId: string) {
    setProcessingTrainingId(trainingId);
    setMessage("");
    setMessageType("");

    try {
      const { error } = await supabase.rpc("activate_training_with_plan", {
        p_training_id: trainingId,
      });

      if (error) throw error;

      const pushWarning = await trySendNotification(trainingId, "published");
      setMessage(`Тренування успішно активовано.${pushWarning}`);
      setMessageType("success");
      await loadAdminData();
    } catch (error) {
      console.error("Training activation error:", error);
      setMessage(
        "Не вдалося активувати тренування. Перевірте SQL-міграцію Sprint 05.2.1.",
      );
      setMessageType("error");
    } finally {
      setProcessingTrainingId(null);
    }
  }

  async function deactivateTraining(trainingId: string) {
    setProcessingTrainingId(trainingId);
    setMessage("");
    setMessageType("");

    try {
      const { error } = await supabase.rpc("deactivate_training_with_plan", {
        p_training_id: trainingId,
      });

      if (error) throw error;

      setMessage(
        "Тренування знято з публікації. Подія та відвідуваність збережені.",
      );
      setMessageType("success");
      await loadAdminData();
    } catch (error) {
      console.error("Training deactivation error:", error);
      setMessage("Не вдалося зняти тренування з публікації.");
      setMessageType("error");
    } finally {
      setProcessingTrainingId(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedTitle = form.title.trim();
    const normalizedLocation = form.location.trim();
    const normalizedTeamName = form.teamName.trim();

    if (
      !normalizedTitle ||
      !form.date ||
      !form.time ||
      !normalizedLocation ||
      !normalizedTeamName
    ) {
      setMessage("Заповніть усі обов’язкові поля.");
      setMessageType("error");
      return;
    }

    const startsAt = new Date(`${form.date}T${form.time}:00`);

    if (Number.isNaN(startsAt.getTime())) {
      setMessage("Перевірте дату та час тренування.");
      setMessageType("error");
      return;
    }

    setIsSaving(true);
    setMessage("");
    setMessageType("");

    try {
      let savedTrainingId = form.id;
      let shouldNotifyUpdate = false;
      let shouldNotifyPublication = false;

      if (form.id) {
        const existingTraining = trainings.find(
          (training) => training.id === form.id,
        );

        const { data, error } = await supabase.rpc(
          "update_training_event_with_plan",
          {
            p_training_id: form.id,
            p_title: normalizedTitle,
            p_starts_at: startsAt.toISOString(),
            p_location: normalizedLocation,
            p_team_name: normalizedTeamName,
          },
        );

        if (error) throw error;

        const result = data as { notify?: boolean } | null;
        shouldNotifyUpdate = Boolean(result?.notify);

        if (form.activateAfterSaving && !existingTraining?.is_active) {
          const { error: activationError } = await supabase.rpc(
            "activate_training_with_plan",
            { p_training_id: form.id },
          );

          if (activationError) throw activationError;
          shouldNotifyPublication = true;
          shouldNotifyUpdate = false;
        } else if (!form.activateAfterSaving && existingTraining?.is_active) {
          const { error: deactivationError } = await supabase.rpc(
            "deactivate_training_with_plan",
            { p_training_id: form.id },
          );

          if (deactivationError) throw deactivationError;
          shouldNotifyUpdate = false;
        }
      } else {
        const { data, error } = await supabase
          .from("trainings")
          .insert({
            title: normalizedTitle,
            starts_at: startsAt.toISOString(),
            location: normalizedLocation,
            team_name: normalizedTeamName,
            is_active: false,
            status: "scheduled",
            cancellation_reason: null,
          })
          .select("id")
          .single();

        if (error) throw error;

        savedTrainingId = data.id;

        if (form.activateAfterSaving) {
          const { error: activationError } = await supabase.rpc(
            "activate_training_with_plan",
            { p_training_id: savedTrainingId },
          );

          if (activationError) throw activationError;
          shouldNotifyPublication = true;
        }
      }

      let pushWarning = "";

      if (savedTrainingId && shouldNotifyPublication) {
        pushWarning = await trySendNotification(
          savedTrainingId,
          "published",
        );
      } else if (savedTrainingId && shouldNotifyUpdate) {
        const existingTraining = trainings.find(
          (training) => training.id === savedTrainingId,
        );
        pushWarning = await trySendNotification(savedTrainingId, "updated", {
          previousStartsAt: existingTraining?.starts_at ?? null,
          previousLocation: existingTraining?.location ?? null,
          previousTeamName: existingTraining?.team_name ?? null,
        });
      }

      setMessage(
        `${form.id ? "Тренування успішно оновлено." : "Нове тренування успішно створено."}${pushWarning}`,
      );
      setMessageType("success");
      setIsEditorOpen(false);
      setForm(emptyTrainingForm);

      await loadAdminData();
    } catch (error) {
      console.error("Training saving error:", error);
      setMessage(
        "Не вдалося зберегти тренування. Перевірте введені дані та SQL-міграцію Sprint 05.2.1.",
      );
      setMessageType("error");
    } finally {
      setIsSaving(false);
    }
  }

  async function cancelTraining(training: TrainingRow) {
    const reason = window.prompt(
      "Вкажіть причину скасування тренування:",
      training.cancellation_reason ?? "",
    );

    if (reason === null) return;

    const normalizedReason = reason.trim();

    if (!normalizedReason) {
      setMessage("Вкажіть причину скасування тренування.");
      setMessageType("error");
      return;
    }

    if (
      !window.confirm(
        `Скасувати тренування «${training.title}»?\n\nПричина: ${normalizedReason}`,
      )
    ) {
      return;
    }

    setProcessingTrainingId(training.id);
    setMessage("");
    setMessageType("");

    try {
      const { data, error } = await supabase.rpc(
        "cancel_training_with_plan",
        {
          p_training_id: training.id,
          p_reason: normalizedReason,
        },
      );

      if (error) throw error;

      const result = data as { notify?: boolean } | null;
      const pushWarning = result?.notify
        ? await trySendNotification(training.id, "cancelled")
        : "";

      setMessage(
        `Тренування скасовано. Відповіді учасників збережено.${pushWarning}`,
      );
      setMessageType("success");
      await loadAdminData();
    } catch (error) {
      console.error("Training cancellation error:", error);
      setMessage("Не вдалося скасувати тренування.");
      setMessageType("error");
    } finally {
      setProcessingTrainingId(null);
    }
  }

  async function restoreTraining(training: TrainingRow) {
    if (!window.confirm(`Відновити тренування «${training.title}»?`)) return;

    setProcessingTrainingId(training.id);
    setMessage("");
    setMessageType("");

    try {
      const { data, error } = await supabase.rpc("restore_training_with_plan", {
        p_training_id: training.id,
      });

      if (error) throw error;

      const result = data as { notify?: boolean } | null;
      const pushWarning = result?.notify
        ? await trySendNotification(training.id, "restored")
        : "";

      setMessage(
        result?.notify
          ? `Тренування відновлено та знову активовано для гравців.${pushWarning}`
          : "Тренування відновлено як заплановане. Для гравців активуйте його повторно.",
      );
      setMessageType("success");
      await loadAdminData();
    } catch (error) {
      console.error("Training restoration error:", error);
      setMessage("Не вдалося відновити тренування.");
      setMessageType("error");
    } finally {
      setProcessingTrainingId(null);
    }
  }

  async function completeTraining(training: TrainingRow) {
    if (
      !window.confirm(
        `Завершити тренування «${training.title}»?\n\nПісля завершення голосування буде закрито, але відвідуваність і відповіді учасників збережуться.`,
      )
    ) {
      return;
    }

    setProcessingTrainingId(training.id);
    setMessage("");
    setMessageType("");

    try {
      const { error } = await supabase.rpc("complete_training_with_plan", {
        p_training_id: training.id,
      });

      if (error) throw error;

      if (form.id === training.id) {
        setIsEditorOpen(false);
        setForm(emptyTrainingForm);
      }

      setMessage(
        "Тренування завершено. Голосування закрито, дані відвідуваності збережено.",
      );
      setMessageType("success");
      await loadAdminData();
    } catch (error) {
      console.error("Training completion error:", error);
      setMessage("Не вдалося завершити тренування.");
      setMessageType("error");
    } finally {
      setProcessingTrainingId(null);
    }
  }

  async function deleteTraining(training: TrainingRow) {
    const answersCount = attendanceCounts[training.id] ?? 0;
    const linkedPlan = linkedPlansByTrainingId[training.id];
    const confirmationText = answersCount
      ? `Видалити тренування «${training.title}» та ${answersCount} пов’язаних відповідей?`
      : `Видалити тренування «${training.title}»?`;
    const planNotice = linkedPlan
      ? "\n\nПов’язаний план буде збережено та повернено до статусу «Заплановано»."
      : "";

    if (!window.confirm(`${confirmationText}${planNotice}`)) return;

    setProcessingTrainingId(training.id);
    setMessage("");
    setMessageType("");

    try {
      const { error } = await supabase.rpc("delete_training_with_plan", {
        p_training_id: training.id,
      });

      if (error) throw error;

      if (form.id === training.id) {
        setIsEditorOpen(false);
        setForm(emptyTrainingForm);
      }

      setMessage(
        linkedPlan
          ? "Тренування видалено. Пов’язаний план збережено як запланований."
          : "Тренування видалено.",
      );
      setMessageType("success");
      await loadAdminData();
    } catch (error) {
      console.error("Training deletion error:", error);
      setMessage("Не вдалося видалити тренування.");
      setMessageType("error");
    } finally {
      setProcessingTrainingId(null);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Admin logout error:", error);

      setMessage("Не вдалося вийти з облікового запису.");
      setMessageType("error");
      setIsLoggingOut(false);
      return;
    }

    router.replace("/admin/login");
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-700">
          Завантаження адмін-панелі...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-8 sm:py-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-400">
                Олімп Футзал
              </p>

              <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                Панель управління
              </h1>

              {adminEmail && (
                <p className="mt-2 text-sm text-slate-400">
                  Адміністратор: {adminEmail}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-sky-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-300"
              >
                + Нове тренування
              </button>

              <Link
                href="/training"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-black transition hover:border-sky-400 hover:text-sky-300"
              >
                Відкрити сторінку
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoggingOut ? "Вихід..." : "Вийти"}
              </button>
            </div>
          </div>
        </header>

        {message && (
          <p
            role="status"
            className={`mt-6 rounded-2xl px-5 py-4 text-sm font-bold ${
              messageType === "success"
                ? "bg-emerald-100 text-emerald-900"
                : "bg-red-100 text-red-900"
            }`}
          >
            {message}
          </p>
        )}

        {isEditorOpen && (
          <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-950/5 sm:p-9">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-600">
                  {form.id ? "Редагування події" : "Створення події"}
                </p>

                <h2 className="mt-3 text-3xl font-black">
                  {form.id ? "Редагувати тренування" : "Нове тренування"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeEditor}
                aria-label="Закрити форму"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-2xl font-bold transition hover:bg-slate-200"
              >
                ×
              </button>
            </div>

            {form.linkedPlanId ? (
              <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm leading-6 text-slate-700">
                <p className="font-black text-sky-800">
                  Це тренування пов’язане з планом.
                </p>
                <p className="mt-1">
                  Тут змінюються дата, час, місце та команда. Назва, вправи, порядок блоків і тренерські нотатки редагуються у Training Builder.
                </p>
                <Link
                  href={`/admin/coach/training-plans/${form.linkedPlanId}`}
                  className="mt-3 inline-flex font-black text-sky-700 transition hover:text-sky-900"
                >
                  Відкрити план тренування →
                </Link>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-8">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label
                    htmlFor="training-title"
                    className="text-sm font-black uppercase tracking-[0.16em] text-slate-600"
                  >
                    Назва
                  </label>

                  <input
                    id="training-title"
                    type="text"
                    value={form.title}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        title: event.target.value,
                      })
                    }
                    maxLength={100}
                    disabled={Boolean(form.linkedPlanId)}
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="training-date"
                    className="text-sm font-black uppercase tracking-[0.16em] text-slate-600"
                  >
                    Дата
                  </label>

                  <input
                    id="training-date"
                    type="date"
                    value={form.date}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        date: event.target.value,
                      })
                    }
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="training-time"
                    className="text-sm font-black uppercase tracking-[0.16em] text-slate-600"
                  >
                    Час
                  </label>

                  <input
                    id="training-time"
                    type="time"
                    value={form.time}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        time: event.target.value,
                      })
                    }
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="training-location"
                    className="text-sm font-black uppercase tracking-[0.16em] text-slate-600"
                  >
                    Місце
                  </label>

                  <input
                    id="training-location"
                    type="text"
                    value={form.location}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        location: event.target.value,
                      })
                    }
                    maxLength={150}
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="training-team"
                    className="text-sm font-black uppercase tracking-[0.16em] text-slate-600"
                  >
                    Команда
                  </label>

                  <input
                    id="training-team"
                    type="text"
                    value={form.teamName}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        teamName: event.target.value,
                      })
                    }
                    maxLength={100}
                    placeholder="Наприклад: Дорослі"
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                <label className="md:col-span-2 flex cursor-pointer items-center justify-between gap-5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                  <span>
                    <span className="block font-black">
                      {form.linkedPlanId
                        ? "Опублікувати для гравців"
                        : "Зробити активним"}
                    </span>

                    <span className="mt-1 block text-sm text-slate-500">
                      Увімкнений перемикач робить подію доступною на сторінці
                      тренування. Вимкнення знімає її з публікації, але не
                      видаляє подію та відвідуваність.
                    </span>
                  </span>

                  <input
                    type="checkbox"
                    checked={form.activateAfterSaving}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        activateAfterSaving: event.target.checked,
                      })
                    }
                    className="h-6 w-6 shrink-0 accent-sky-500"
                  />
                </label>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex min-h-14 flex-1 items-center justify-center rounded-full bg-slate-950 px-7 py-4 font-black text-white transition enabled:hover:-translate-y-0.5 enabled:hover:bg-sky-500 enabled:hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving
                    ? "Збереження..."
                    : form.id
                      ? "Зберегти зміни"
                      : "Створити тренування"}
                </button>

                <button
                  type="button"
                  onClick={closeEditor}
                  disabled={isSaving}
                  className="inline-flex min-h-14 items-center justify-center rounded-full border border-slate-300 px-7 py-4 font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                >
                  Скасувати
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Усього тренувань</p>

            <strong className="mt-3 block text-4xl font-black text-sky-600">
              {trainings.length}
            </strong>
          </article>

          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Активна подія</p>

            <strong className="mt-3 block text-xl font-black">
              {activeTraining
                ? formatTrainingDate(activeTraining.starts_at)
                : "Не вибрана"}
            </strong>
          </article>

          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Усього відповідей
            </p>

            <strong className="mt-3 block text-4xl font-black text-sky-600">
              {totalAnswers}
            </strong>
          </article>
        </section>

        {activeTraining && (
          <section
            className={`mt-8 overflow-hidden rounded-[2rem] p-6 text-white shadow-xl sm:p-8 ${
              activeTraining.status === "cancelled"
                ? "bg-red-950"
                : "bg-slate-950"
            }`}
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-sky-400">
                    Активна подія
                  </p>

                  {activeTraining.status === "cancelled" && (
                    <span className="rounded-full bg-red-400/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-red-200">
                      Скасовано
                    </span>
                  )}
                </div>

                <h2 className="mt-3 text-3xl font-black">
                  {activeTraining.title}
                </h2>

                <p className="mt-4 text-lg text-slate-300">
                  {formatTrainingDate(activeTraining.starts_at)}
                  {" · "}
                  {formatTrainingTime(activeTraining.starts_at)}
                  {" · "}
                  {activeTraining.location}
                  {activeTraining.team_name ? (
                    <>
                      {" · "}
                      {activeTraining.team_name}
                    </>
                  ) : null}
                </p>

                {activeTraining.status === "cancelled" &&
                  activeTraining.cancellation_reason && (
                    <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 font-bold text-red-100">
                      Причина: {activeTraining.cancellation_reason}
                    </p>
                  )}

                <p className="mt-3 text-sm text-slate-400">
                  Уже відповіли: {attendanceCounts[activeTraining.id] ?? 0}
                </p>

                {linkedPlansByTrainingId[activeTraining.id] ? (
                  <div className="max-w-xl">
                    <LinkedPlanSummaryCard
                      plan={linkedPlansByTrainingId[activeTraining.id]}
                    />
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => openEditForm(activeTraining)}
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 px-6 py-3 font-black text-white transition hover:border-sky-400 hover:text-sky-300"
                >
                  Редагувати
                </button>

                {linkedPlansByTrainingId[activeTraining.id] ? (
                  <Link
                    href={`/admin/coach/training-plans/${linkedPlansByTrainingId[activeTraining.id].id}`}
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-sky-300/40 px-6 py-3 font-black text-sky-200 transition hover:bg-sky-400/10"
                  >
                    Відкрити план
                  </Link>
                ) : null}

                {activeTraining.status === "scheduled" && (
                  <button
                    type="button"
                    onClick={() => void completeTraining(activeTraining)}
                    disabled={processingTrainingId === activeTraining.id}
                    className="inline-flex min-h-12 items-center justify-center rounded-full bg-emerald-400 px-6 py-3 font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {processingTrainingId === activeTraining.id
                      ? "Завершення..."
                      : "Завершити"}
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="mt-8">
          <div className="flex items-end justify-between gap-5">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-600">
                Розклад
              </p>

              <h2 className="mt-2 text-3xl font-black">Усі тренування</h2>
              <p className="mt-2 text-sm text-slate-500">
                Загальний клубний календар із матчами, турнірами та іншими подіями буде окремим модулем.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateForm}
              className="hidden min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-sky-500 hover:text-slate-950 sm:inline-flex"
            >
              + Додати
            </button>
          </div>

          {trainings.length > 0 ? (
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              {trainings.map((training) => {
                const isProcessing = processingTrainingId === training.id;
                const linkedPlan = linkedPlansByTrainingId[training.id] ?? null;

                return (
                  <article
                    id={`training-${training.id}`}
                    key={training.id}
                    className={`rounded-3xl border bg-white p-6 shadow-sm transition target:border-violet-400 target:ring-4 target:ring-violet-100 ${
                      training.status === "cancelled"
                        ? "border-red-300 ring-4 ring-red-100"
                        : training.is_active
                          ? "border-sky-400 ring-4 ring-sky-100"
                          : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-5">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {training.is_active && (
                            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-sky-700">
                              Активна
                            </span>
                          )}

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
                              training.status === "cancelled"
                                ? "bg-red-100 text-red-700"
                                : training.status === "completed"
                                  ? "bg-slate-200 text-slate-700"
                                  : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {getStatusLabel(training.status)}
                          </span>

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                            Відповідей: {attendanceCounts[training.id] ?? 0}
                          </span>
                        </div>

                        <h3 className="mt-4 text-xl font-black">
                          {training.title}
                        </h3>

                        <p className="mt-3 leading-7 text-slate-600">
                          {formatTrainingDate(training.starts_at)}
                          <br />
                          {formatTrainingTime(training.starts_at)}
                          {" · "}
                          {training.location}
                          {training.team_name ? (
                            <>
                              <br />
                              Команда: {training.team_name}
                            </>
                          ) : null}
                        </p>

                        {training.status === "cancelled" &&
                          training.cancellation_reason && (
                            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-800">
                              Причина скасування: {training.cancellation_reason}
                            </p>
                          )}

                        {linkedPlan ? (
                          <LinkedPlanSummaryCard plan={linkedPlan} />
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEditForm(training)}
                        disabled={isProcessing}
                        className="inline-flex min-h-10 items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-sky-500 hover:text-slate-950 disabled:opacity-50"
                      >
                        Редагувати
                      </button>

                      {linkedPlan ? (
                        <Link
                          href={`/admin/coach/training-plans/${linkedPlan.id}`}
                          className="inline-flex min-h-10 items-center justify-center rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-black text-sky-800 transition hover:bg-sky-100"
                        >
                          Відкрити план
                        </Link>
                      ) : null}

                      {linkedPlan ? (
                        <Link
                          href={`/admin/attendance/${training.id}`}
                          className="inline-flex min-h-10 items-center justify-center rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-black text-violet-800 transition hover:bg-violet-100"
                        >
                          Відвідуваність
                        </Link>
                      ) : null}

                      {!training.is_active &&
                        training.status === "scheduled" && (
                          <button
                            type="button"
                            onClick={() => activateTraining(training.id)}
                            disabled={isProcessing}
                            className="inline-flex min-h-10 items-center justify-center rounded-full bg-sky-100 px-4 py-2 text-sm font-black text-sky-800 transition hover:bg-sky-200 disabled:opacity-50"
                          >
                            {isProcessing ? "Обробка..." : "Зробити активною"}
                          </button>
                        )}

                      {training.is_active &&
                        training.status === "scheduled" && (
                          <button
                            type="button"
                            onClick={() => void deactivateTraining(training.id)}
                            disabled={isProcessing}
                            className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                          >
                            {isProcessing
                              ? "Обробка..."
                              : "Зняти з публікації"}
                          </button>
                        )}

                      {training.is_active &&
                        training.status === "scheduled" && (
                          <button
                            type="button"
                            onClick={() => void completeTraining(training)}
                            disabled={isProcessing}
                            className="inline-flex min-h-10 items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"
                          >
                            {isProcessing ? "Обробка..." : "Завершити"}
                          </button>
                        )}

                      {training.status === "scheduled" ? (
                        <button
                          type="button"
                          onClick={() => cancelTraining(training)}
                          disabled={isProcessing}
                          className="inline-flex min-h-10 items-center justify-center rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-black text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
                        >
                          Скасувати
                        </button>
                      ) : training.status === "cancelled" ? (
                        <button
                          type="button"
                          onClick={() => restoreTraining(training)}
                          disabled={isProcessing}
                          className="inline-flex min-h-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"
                        >
                          Відновити
                        </button>
                      ) : null}

                      {training.status === "completed" && (
                        <Link
                          href={`/admin/attendance/${training.id}`}
                          className="inline-flex min-h-10 items-center justify-center rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-black text-sky-800 transition hover:bg-sky-100"
                        >
                          Переглянути відмітку
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={() => deleteTraining(training)}
                        disabled={isProcessing}
                        className="inline-flex min-h-10 items-center justify-center rounded-full border border-red-200 px-4 py-2 text-sm font-black text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        Видалити
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-3xl bg-white p-8 text-center shadow-sm">
              <p className="font-bold text-slate-600">Тренувань поки немає.</p>

              <button
                type="button"
                onClick={openCreateForm}
                className="mt-5 rounded-full bg-slate-950 px-6 py-3 font-black text-white"
              >
                Створити перше тренування
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
