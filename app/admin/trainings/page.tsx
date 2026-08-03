"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type TrainingStatus = "scheduled" | "cancelled" | "completed";

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
  training_id: string;
};

type TrainingForm = {
  id: string | null;
  title: string;
  date: string;
  time: string;
  location: string;
  activateAfterSaving: boolean;
};

const emptyTrainingForm: TrainingForm = {
  id: null,
  title: "Командне тренування",
  date: "",
  time: "19:00",
  location: "ФОК Олімп",
  activateAfterSaving: false,
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

export default function AdminTrainingsPage() {
  const router = useRouter();

  const [adminEmail, setAdminEmail] = useState("");

  const [trainings, setTrainings] = useState<TrainingRow[]>([]);

  const [attendanceCounts, setAttendanceCounts] = useState<
    Record<string, number>
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
        "id, title, starts_at, location, is_active, status, cancellation_reason, created_at, updated_at",
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

    const { data: attendanceData, error: attendanceError } = await supabase
      .from("training_attendance")
      .select("training_id");

    if (attendanceError) {
      console.error("Attendance counts loading error:", attendanceError);

      setMessage("Не вдалося завантажити статистику відповідей.");
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

    setTrainings((trainingData ?? []) as TrainingRow[]);
    setAttendanceCounts(counts);
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

  function openCreateForm() {
    setForm(emptyTrainingForm);
    setIsEditorOpen(true);
    setMessage("");
    setMessageType("");
  }

  function openEditForm(training: TrainingRow) {
    setForm({
      id: training.id,
      title: training.title,
      date: getDateInputValue(training.starts_at),
      time: getTimeInputValue(training.starts_at),
      location: training.location,
      activateAfterSaving: training.is_active,
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

  async function activateTraining(trainingId: string) {
    setProcessingTrainingId(trainingId);
    setMessage("");
    setMessageType("");

    const { error } = await supabase.rpc("activate_training", {
      target_training_id: trainingId,
    });

    if (error) {
      console.error("Training activation error:", error);

      setMessage("Не вдалося активувати тренування.");
      setMessageType("error");
      setProcessingTrainingId(null);
      return;
    }

    setMessage("Тренування успішно активовано.");
    setMessageType("success");

    await loadAdminData();
    setProcessingTrainingId(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedTitle = form.title.trim();

    const normalizedLocation = form.location.trim();

    if (!normalizedTitle || !form.date || !form.time || !normalizedLocation) {
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

      if (form.id) {
        const { error } = await supabase
          .from("trainings")
          .update({
            title: normalizedTitle,
            starts_at: startsAt.toISOString(),
            location: normalizedLocation,
          })
          .eq("id", form.id);

        if (error) {
          throw error;
        }
      } else {
        const { data, error } = await supabase
          .from("trainings")
          .insert({
            title: normalizedTitle,
            starts_at: startsAt.toISOString(),
            location: normalizedLocation,
            is_active: false,
            status: "scheduled",
            cancellation_reason: null,
          })
          .select("id")
          .single();

        if (error) {
          throw error;
        }

        savedTrainingId = data.id;
      }

      if (form.activateAfterSaving && savedTrainingId) {
        const { error } = await supabase.rpc("activate_training", {
          target_training_id: savedTrainingId,
        });

        if (error) {
          throw error;
        }
      }

      setMessage(
        form.id
          ? "Тренування успішно оновлено."
          : "Нове тренування успішно створено.",
      );

      setMessageType("success");
      setIsEditorOpen(false);
      setForm(emptyTrainingForm);

      await loadAdminData();
    } catch (error) {
      console.error("Training saving error:", error);

      setMessage("Не вдалося зберегти тренування. Перевірте введені дані.");
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

    if (reason === null) {
      return;
    }

    const normalizedReason = reason.trim();

    if (!normalizedReason) {
      setMessage("Вкажіть причину скасування тренування.");
      setMessageType("error");
      return;
    }

    const isConfirmed = window.confirm(
      `Скасувати тренування «${training.title}»?\n\nПричина: ${normalizedReason}`,
    );

    if (!isConfirmed) {
      return;
    }

    setProcessingTrainingId(training.id);
    setMessage("");
    setMessageType("");

    const { error } = await supabase
      .from("trainings")
      .update({
        status: "cancelled",
        is_active: false,
        cancellation_reason: normalizedReason,
      })
      .eq("id", training.id);

    if (error) {
      console.error("Training cancellation error:", error);

      setMessage("Не вдалося скасувати тренування.");
      setMessageType("error");
      setProcessingTrainingId(null);
      return;
    }

    setMessage("Тренування скасовано. Відповіді учасників збережено.");
    setMessageType("success");

    await loadAdminData();
    setProcessingTrainingId(null);
  }

  async function restoreTraining(training: TrainingRow) {
    const isConfirmed = window.confirm(
      `Відновити тренування «${training.title}»?`,
    );

    if (!isConfirmed) {
      return;
    }

    setProcessingTrainingId(training.id);
    setMessage("");
    setMessageType("");

    const { error } = await supabase
      .from("trainings")
      .update({
        status: "scheduled",
        is_active: false,
        cancellation_reason: null,
      })
      .eq("id", training.id);

    if (error) {
      console.error("Training restoration error:", error);

      setMessage("Не вдалося відновити тренування.");
      setMessageType("error");
      setProcessingTrainingId(null);
      return;
    }

    setMessage("Тренування відновлено.");
    setMessageType("success");

    await loadAdminData();
    setProcessingTrainingId(null);
  }

  async function completeTraining(training: TrainingRow) {
    const isConfirmed = window.confirm(
      `Завершити тренування «${training.title}»?\n\nПісля завершення голосування буде закрито, але відвідуваність і відповіді учасників збережуться.`,
    );

    if (!isConfirmed) {
      return;
    }

    setProcessingTrainingId(training.id);
    setMessage("");
    setMessageType("");

    const { error } = await supabase
      .from("trainings")
      .update({
        status: "completed",
        is_active: false,
        cancellation_reason: null,
      })
      .eq("id", training.id);

    if (error) {
      console.error("Training completion error:", error);

      setMessage("Не вдалося завершити тренування.");
      setMessageType("error");
      setProcessingTrainingId(null);
      return;
    }

    if (form.id === training.id) {
      setIsEditorOpen(false);
      setForm(emptyTrainingForm);
    }

    setMessage(
      "Тренування завершено. Голосування закрито, дані відвідуваності збережено.",
    );
    setMessageType("success");

    await loadAdminData();
    setProcessingTrainingId(null);
  }

  async function deleteTraining(training: TrainingRow) {
    const answersCount = attendanceCounts[training.id] ?? 0;

    const confirmationText = answersCount
      ? `Видалити тренування «${training.title}» та ${answersCount} пов’язаних відповідей?`
      : `Видалити тренування «${training.title}»?`;

    const isConfirmed = window.confirm(confirmationText);

    if (!isConfirmed) {
      return;
    }

    setProcessingTrainingId(training.id);
    setMessage("");
    setMessageType("");

    const { error } = await supabase
      .from("trainings")
      .delete()
      .eq("id", training.id);

    if (error) {
      console.error("Training deletion error:", error);

      setMessage("Не вдалося видалити тренування.");
      setMessageType("error");
      setProcessingTrainingId(null);
      return;
    }

    if (form.id === training.id) {
      setIsEditorOpen(false);
      setForm(emptyTrainingForm);
    }

    setMessage("Тренування видалено.");
    setMessageType("success");

    await loadAdminData();
    setProcessingTrainingId(null);
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
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
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

                <div className="md:col-span-2">
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

                <label className="md:col-span-2 flex cursor-pointer items-center justify-between gap-5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                  <span>
                    <span className="block font-black">Зробити активним</span>

                    <span className="mt-1 block text-sm text-slate-500">
                      Після збереження ця подія відображатиметься на сторінці
                      тренування.
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
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => openEditForm(activeTraining)}
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 px-6 py-3 font-black text-white transition hover:border-sky-400 hover:text-sky-300"
                >
                  Редагувати
                </button>

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
                Календар
              </p>

              <h2 className="mt-2 text-3xl font-black">Усі тренування</h2>
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

                return (
                  <article
                    key={training.id}
                    className={`rounded-3xl border bg-white p-6 shadow-sm ${
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
                        </p>

                        {training.status === "cancelled" &&
                          training.cancellation_reason && (
                            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-800">
                              Причина скасування: {training.cancellation_reason}
                            </p>
                          )}
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
