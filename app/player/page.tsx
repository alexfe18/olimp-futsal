"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import type { PlayerAccessContext } from "@/lib/auth/player-auth";

export default function PlayerHomePage() {
  const router = useRouter();
  const [context, setContext] = useState<PlayerAccessContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function initialize() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase.rpc("get_my_access_context");

      if (!active) return;

      if (error || !data) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      const nextContext = data as PlayerAccessContext;

      if (nextContext.account_status !== "active") {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      if (nextContext.must_change_password) {
        router.replace("/account/change-password");
        return;
      }

      await supabase.rpc("record_my_login");
      setContext(nextContext);
      setIsLoading(false);
    }

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        router.replace("/login");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (isLoading || !context) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
        <p className="font-bold text-slate-500">Завантажуємо кабінет…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="bg-slate-950 px-5 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-400">
                Кабінет гравця
              </p>
              <h1 className="mt-3 text-4xl font-black">
                {context.display_name}
              </h1>
              <p className="mt-3 text-slate-300">
                {context.team?.name ?? "Олімп Футзал"}
                {context.player?.sporting_is_active === false
                  ? " · спортивний статус: неактивний"
                  : ""}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 px-6 font-black text-white transition hover:bg-white/10"
            >
              Вийти
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-9">
        <div className="grid gap-5 md:grid-cols-2">
          <Link
            href="/training"
            className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
          >
            <span className="text-4xl">📅</span>
            <h2 className="mt-5 text-2xl font-black">Тренування</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Переглянути актуальне тренування та доступну інформацію команди.
            </p>
          </Link>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
            <span className="text-4xl">👤</span>
            <h2 className="mt-5 text-2xl font-black">Мій профіль</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Номер гравця, статистика, відвідуваність та персональні дані
              з’являться тут у наступних player-area спринтах.
            </p>
          </div>
        </div>

        {context.can_access_admin && (
          <Link
            href="/admin"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 font-black text-white"
          >
            Перейти до адміністративної панелі
          </Link>
        )}
      </section>
    </main>
  );
}
