"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type TrainingStatus = "scheduled" | "cancelled" | "completed";

type TrainingRow = {
  id: string;
  title: string;
  starts_at: string;
  location: string;
  is_active: boolean;
  status: TrainingStatus;
};

type AttendanceRow = {
  training_id: string;
  status: "yes" | "maybe" | "no";
};

type PlayerRow = {
  id: string;
  is_active: boolean;
};

type DashboardStats = {
  trainings: number;
  activePlayers: number;
  answers: number;
  yes: number;
  maybe: number;
  no: number;
};

const emptyStats: DashboardStats = {
  trainings: 0,
  activePlayers: 0,
  answers: 0,
  yes: 0,
  maybe: 0,
  no: 0,
};

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

export default function AdminDashboardPage() {
  const [activeTraining, setActiveTraining] = useState<TrainingRow | null>(
    null,
  );

  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);

  const [stats, setStats] = useState<DashboardStats>(emptyStats);

  const [isLoading, setIsLoading] = useState(true);

  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setLoadError("");

      const [
        { data: trainingsData, error: trainingsError },
        { data: playersData, error: playersError },
        { data: attendanceData, error: attendanceError },
      ] = await Promise.all([
        supabase
          .from("trainings")
          .select("id, title, starts_at, location, is_active, status")
          .order("starts_at", {
            ascending: false,
          }),

        supabase.from("players").select("id, is_active").eq("is_active", true),

        supabase.from("training_attendance").select("training_id, status"),
      ]);

      if (!isMounted) {
        return;
      }

      if (trainingsError || playersError || attendanceError) {
        console.error("Dashboard loading error:", {
          trainingsError,
          playersError,
          attendanceError,
        });

        setLoadError("Не вдалося повністю завантажити дані адмін-панелі.");

        setIsLoading(false);
        return;
      }

      const trainings = (trainingsData ?? []) as TrainingRow[];

      const players = (playersData ?? []) as PlayerRow[];

      const attendanceRecords = (attendanceData ?? []) as AttendanceRow[];

      const currentTraining =
        trainings.find((training) => training.is_active) ?? null;

      const currentAttendance = currentTraining
        ? attendanceRecords.filter(
            (record) => record.training_id === currentTraining.id,
          )
        : [];

      setActiveTraining(currentTraining);
      setAttendance(currentAttendance);

      setStats({
        trainings: trainings.length,
        activePlayers: players.length,
        answers: currentAttendance.length,
        yes: currentAttendance.filter((record) => record.status === "yes")
          .length,
        maybe: currentAttendance.filter((record) => record.status === "maybe")
          .length,
        no: currentAttendance.filter((record) => record.status === "no").length,
      });

      setIsLoading(false);
    }

    void loadDashboard();

    const realtimeChannel = supabase
      .channel("olimp-admin-dashboard-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trainings",
        },
        () => {
          void loadDashboard();
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
          void loadDashboard();
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
          void loadDashboard();
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(realtimeChannel);
    };
  }, []);

  const unansweredPlayers = useMemo(
    () => Math.max(stats.activePlayers - stats.answers, 0),
    [stats.activePlayers, stats.answers],
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-700">
          Завантаження огляду...
        </p>
      </div>
    );
  }

  return (
    <div>
      <header className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-400">
          Олімп Футзал
        </p>

        <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black sm:text-4xl">Огляд клубу</h1>

            <p className="mt-3 max-w-2xl leading-7 text-slate-300">
              Керуйте тренуваннями, гравцями, відвідуваністю та сповіщеннями з
              єдиного кабінету.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/trainings"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-sky-400 px-6 py-3 font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-300"
            >
              + Нове тренування
            </Link>

            <Link
              href="/admin/push"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 px-6 py-3 font-black transition hover:border-sky-400 hover:text-sky-300"
            >
              Надіслати Push
            </Link>
          </div>
        </div>
      </header>

      {loadError && (
        <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-bold text-red-800">
          {loadError}
        </p>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-slate-500">Активні гравці</p>

          <strong className="mt-3 block text-4xl font-black text-sky-600">
            {stats.activePlayers}
          </strong>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-slate-500">Усього тренувань</p>

          <strong className="mt-3 block text-4xl font-black text-sky-600">
            {stats.trainings}
          </strong>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-slate-500">Відповіли</p>

          <strong className="mt-3 block text-4xl font-black text-emerald-600">
            {stats.answers}
          </strong>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-slate-500">Не відповіли</p>

          <strong className="mt-3 block text-4xl font-black text-amber-600">
            {unansweredPlayers}
          </strong>
        </article>
      </section>

      {activeTraining ? (
        <section
          className={`mt-8 overflow-hidden rounded-[2rem] p-6 text-white shadow-xl sm:p-8 ${
            activeTraining.status === "cancelled"
              ? "bg-red-950"
              : "bg-slate-950"
          }`}
        >
          <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-sky-400">
                Найближче тренування
              </p>

              <h2 className="mt-3 text-3xl font-black">
                {activeTraining.title}
              </h2>

              <p className="mt-4 text-lg leading-8 text-slate-300">
                {formatTrainingDate(activeTraining.starts_at)}
                {" · "}
                {formatTrainingTime(activeTraining.starts_at)}
                {" · "}
                {activeTraining.location}
              </p>

              <div className="mt-6 flex flex-wrap gap-2 text-sm font-black">
                <span className="rounded-full bg-emerald-400/15 px-4 py-2 text-emerald-200">
                  Будуть: {stats.yes}
                </span>

                <span className="rounded-full bg-amber-400/15 px-4 py-2 text-amber-200">
                  Можливо: {stats.maybe}
                </span>

                <span className="rounded-full bg-red-400/15 px-4 py-2 text-red-200">
                  Не будуть: {stats.no}
                </span>

                <span className="rounded-full bg-white/10 px-4 py-2 text-slate-200">
                  Не відповіли: {unansweredPlayers}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/admin/trainings"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-sky-400 px-6 py-3 font-black text-slate-950 transition hover:bg-sky-300"
              >
                Керувати тренуванням
              </Link>

              <Link
                href="/training"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 px-6 py-3 font-black transition hover:border-sky-400 hover:text-sky-300"
              >
                Відкрити сторінку
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-lg font-black">Активне тренування не вибрано</p>

          <p className="mt-2 text-slate-500">
            Створіть нове тренування або активуйте існуюче.
          </p>

          <Link
            href="/admin/trainings"
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 py-3 font-black text-white transition hover:bg-sky-500 hover:text-slate-950"
          >
            Перейти до тренувань
          </Link>
        </section>
      )}

      <section className="mt-8">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-600">
            Швидкий доступ
          </p>

          <h2 className="mt-2 text-3xl font-black">Розділи кабінету</h2>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <AdminModuleCard
            href="/admin/trainings"
            icon="📅"
            title="Тренування"
            description="Створення, редагування, активація та скасування."
          />

          <AdminModuleCard
            href="/admin/players"
            icon="👥"
            title="Гравці"
            description="Склад команди, номери, позиції та статуси."
          />

          <AdminModuleCard
            href="/admin/attendance"
            icon="📊"
            title="Відвідуваність"
            description="Відповіді гравців і списки по тренуваннях."
          />

          <AdminModuleCard
            href="/admin/statistics"
            icon="📈"
            title="Статистика"
            description="Відсоток відвідуваності та дисципліна."
          />

          <AdminModuleCard
            href="/admin/push"
            icon="📢"
            title="Push"
            description="Командні та персональні сповіщення."
          />

          <AdminModuleCard
            href="/admin/news"
            icon="📝"
            title="Новини"
            description="Створення та публікація новин клубу."
          />

          <AdminModuleCard
            href="/admin/gallery"
            icon="🖼️"
            title="Галерея"
            description="Фотографії, альбоми та матеріали клубу."
          />

          <AdminModuleCard
            href="/admin/settings"
            icon="⚙️"
            title="Налаштування"
            description="Дані клубу та параметри застосунку."
          />
        </div>
      </section>
    </div>
  );
}

function AdminModuleCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-sky-300 hover:shadow-xl"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-2xl transition group-hover:bg-sky-400">
        {icon}
      </span>

      <h3 className="mt-5 text-xl font-black">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>

      <span className="mt-5 inline-flex text-sm font-black text-sky-700">
        Відкрити →
      </span>
    </Link>
  );
}
