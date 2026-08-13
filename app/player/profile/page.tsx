"use client";

import { useEffect, useMemo, useState } from "react";

import { usePlayerSession } from "@/components/auth/PlayerAccessGate";
import {
  getPlayerDisplayName,
  loadMyPlayerSportsProfile,
  type PlayerSportsProfile,
} from "@/lib/player/player-profile";
import { supabase } from "@/lib/supabase";

type AccountIdentifier = {
  kind: "email" | "phone" | "unknown";
  value: string | null;
};

function formatAccountStatus(status: string) {
  if (status === "active") return "Активний";
  if (status === "invited") return "Запрошений до команди";
  if (status === "suspended") return "Призупинений";
  if (status === "archived") return "Архівний";
  return status;
}

function formatMembershipStatus(status: string | undefined) {
  if (status === "active") return "У складі команди";
  if (status === "inactive") return "Поза активним складом";
  if (status === "invited") return "Запрошений до команди";
  return status || "Не вказано";
}

export default function PlayerProfilePage() {
  const { context } = usePlayerSession();
  const playerId = context.player?.id ?? null;

  const [profile, setProfile] = useState<PlayerSportsProfile | null>(null);
  const [accountIdentifier, setAccountIdentifier] =
    useState<AccountIdentifier>({ kind: "unknown", value: null });
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      setMessage(null);

      try {
        const [
          playerResult,
          {
            data: { user },
          },
        ] = await Promise.all([
          playerId ? loadMyPlayerSportsProfile(playerId) : Promise.resolve(null),
          supabase.auth.getUser(),
        ]);

        if (!active) return;

        setProfile(playerResult);

        if (user?.email) {
          setAccountIdentifier({ kind: "email", value: user.email });
        } else if (user?.phone) {
          setAccountIdentifier({ kind: "phone", value: user.phone });
        } else {
          setAccountIdentifier({ kind: "unknown", value: null });
        }
      } catch (error) {
        console.error("Player profile loading error:", error);
        if (!active) return;

        // The authenticated access context still lets the page render safely.
        setProfile(null);
        setMessage(
          "Додаткові спортивні дані профілю зараз недоступні. Основні дані облікового запису залишаються доступними.",
        );
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [playerId]);

  const displayName = getPlayerDisplayName(profile, context.display_name);
  const initial = useMemo(
    () => displayName.trim().charAt(0).toUpperCase() || "О",
    [displayName],
  );

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-950 md:pb-0">
      <section className="bg-slate-950 px-5 py-10 text-white sm:py-12">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-400">
            Мій профіль
          </p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">
            Профіль гравця
          </h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            Спортивні дані, команда та інформація вашого облікового запису.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-6 px-5 py-8 sm:py-10">
        {message && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-900">
            {message}
          </div>
        )}

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[180px_1fr] md:items-center">
            <div className="flex justify-center md:justify-start">
              {profile?.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt={`Фото ${displayName}`}
                  className="h-40 w-40 rounded-[2rem] object-cover ring-1 ring-slate-200"
                />
              ) : (
                <div
                  className="flex h-40 w-40 items-center justify-center rounded-[2rem] bg-slate-950 text-6xl font-black text-white"
                  aria-label="Фото гравця не додано"
                >
                  {initial}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {profile?.shirt_number != null && (
                  <span className="rounded-full bg-sky-100 px-3 py-1.5 text-sm font-black text-sky-800">
                    №{profile.shirt_number}
                  </span>
                )}
                <span
                  className={`rounded-full px-3 py-1.5 text-sm font-black ${
                    (profile?.is_active ?? context.player?.sporting_is_active) === false
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {(profile?.is_active ?? context.player?.sporting_is_active) === false
                    ? "Спортивний статус: неактивний"
                    : "Активний гравець"}
                </span>
              </div>

              <h2 className="mt-4 truncate text-3xl font-black sm:text-4xl">
                {displayName}
              </h2>
              <p className="mt-3 text-lg font-bold text-slate-600">
                {profile?.position?.trim() || "Позиція не вказана"}
              </p>
              <p className="mt-2 text-slate-500">
                {context.team?.name ?? "Олімп Футзал"}
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">
              Спортивні дані
            </p>
            <h2 className="mt-2 text-2xl font-black">Картка гравця</h2>

            <dl className="mt-6 divide-y divide-slate-100">
              <div className="flex items-center justify-between gap-5 py-4">
                <dt className="text-sm font-bold text-slate-500">Номер</dt>
                <dd className="text-right font-black">
                  {profile?.shirt_number != null ? `№${profile.shirt_number}` : "Не вказано"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-5 py-4">
                <dt className="text-sm font-bold text-slate-500">Позиція</dt>
                <dd className="text-right font-black">
                  {profile?.position?.trim() || "Не вказано"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-5 py-4">
                <dt className="text-sm font-bold text-slate-500">Команда</dt>
                <dd className="text-right font-black">
                  {context.team?.name ?? "Олімп Футзал"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-5 py-4">
                <dt className="text-sm font-bold text-slate-500">Статус у команді</dt>
                <dd className="text-right font-black">
                  {formatMembershipStatus(context.team?.membership_status)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
              Обліковий запис
            </p>
            <h2 className="mt-2 text-2xl font-black">Доступ до Futsal OS</h2>

            <dl className="mt-6 divide-y divide-slate-100">
              <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
                <dt className="text-sm font-bold text-slate-500">
                  Статус акаунта
                </dt>
                <dd className="font-black sm:text-right">
                  {formatAccountStatus(context.account_status)}
                </dd>
              </div>
              <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
                <dt className="text-sm font-bold text-slate-500">
                  Спосіб входу
                </dt>
                <dd className="min-w-0 break-words font-black sm:max-w-[65%] sm:text-right">
                  {accountIdentifier.kind === "email"
                    ? "Email"
                    : accountIdentifier.kind === "phone"
                      ? "Телефон"
                      : "Не визначено"}
                </dd>
              </div>
              <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
                <dt className="text-sm font-bold text-slate-500">
                  Ідентифікатор
                </dt>
                <dd className="min-w-0 break-words font-black sm:max-w-[65%] sm:text-right">
                  {isLoading
                    ? "Завантаження…"
                    : accountIdentifier.value || "Не вказано"}
                </dd>
              </div>
            </dl>

            <p className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
              Налаштування сповіщень, пристроїв і додаткові параметри профілю
              з’являтимуться тут у міру підключення відповідних модулів Futsal OS.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}