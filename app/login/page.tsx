"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { getPlayerLoginEnvironment } from "@/lib/auth/login-environment";
import {
  normalizeUkrainianLoginPhone,
  type PlayerAccessContext,
} from "@/lib/auth/player-auth";
import { supabase } from "@/lib/supabase";


function getSafePostLoginPath(canAccessAdmin: boolean) {
  if (typeof window === "undefined") {
    return canAccessAdmin ? "/admin" : "/player";
  }

  const candidate = new URLSearchParams(window.location.search).get("next");

  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return canAccessAdmin ? "/admin" : "/player";
  }

  if (candidate === "/training" || candidate.startsWith("/training?")) {
    return candidate;
  }

  if (candidate === "/player" || candidate.startsWith("/player/")) {
    return candidate;
  }

  if (
    canAccessAdmin &&
    (candidate === "/admin" || candidate.startsWith("/admin/"))
  ) {
    return candidate;
  }

  return canAccessAdmin ? "/admin" : "/player";
}

function navigateAfterLogin(path: string) {
  if (typeof window !== "undefined") {
    window.location.replace(path);
  }
}

export default function PlayerLoginPage() {
  const router = useRouter();
  const loginEnvironment = useMemo(() => getPlayerLoginEnvironment(), []);
  const usesEmail = loginEnvironment.identifier === "email";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isChecking, setIsChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function checkExistingSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      if (!session) {
        setIsChecking(false);
        return;
      }

      const { data, error } = await supabase.rpc("get_my_access_context");

      if (!active) return;

      if (error || !data) {
        await supabase.auth.signOut();
        setIsChecking(false);
        return;
      }

      const context = data as PlayerAccessContext;

      if (context.must_change_password) {
        router.replace("/account/change-password");
        return;
      }

      navigateAfterLogin(getSafePostLoginPath(context.can_access_admin));
    }

    void checkExistingSession();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedIdentifier = identifier.trim();

    if (usesEmail) {
      if (
        !normalizedIdentifier ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedIdentifier)
      ) {
        setMessage("Введіть коректний DEV email.");
        return;
      }
    } else {
      const normalizedPhone = normalizeUkrainianLoginPhone(normalizedIdentifier);

      if (!normalizedPhone) {
        setMessage("Введіть номер у форматі +380XXXXXXXXX.");
        return;
      }
    }

    if (!password) {
      setMessage("Введіть пароль.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const credentials = usesEmail
      ? {
          email: normalizedIdentifier.toLowerCase(),
          password,
        }
      : {
          phone: normalizeUkrainianLoginPhone(normalizedIdentifier)!,
          password,
        };

    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword(credentials);

    if (signInError) {
      console.error("Player login error:", signInError);
      setMessage(
        usesEmail
          ? "Невірний DEV email або пароль."
          : "Невірний номер телефону або пароль.",
      );
      setIsSubmitting(false);
      return;
    }

    if (!signInData.session) {
      console.error("Player login session missing after successful sign-in.");
      setMessage("Вхід виконано, але сесію не вдалося створити.");
      setIsSubmitting(false);
      return;
    }

    const {
      data: { session: persistedSession },
      error: persistedSessionError,
    } = await supabase.auth.getSession();

    if (persistedSessionError || !persistedSession) {
      console.error("Player login session persistence error:", {
        message: persistedSessionError?.message ?? null,
      });
      setMessage(
        "Не вдалося зберегти сесію входу у браузері. Спробуйте ще раз.",
      );
      setIsSubmitting(false);
      return;
    }

    console.info("[auth] login session persisted", {
      authenticated: true,
      expiresInSeconds: persistedSession.expires_at
        ? persistedSession.expires_at - Math.floor(Date.now() / 1000)
        : null,
    });

    const { data, error: contextError } = await supabase.rpc(
      "get_my_access_context",
    );

    if (contextError || !data) {
      console.error("Player access context error:", {
        message: contextError?.message ?? null,
        code: contextError?.code ?? null,
        details: contextError?.details ?? null,
        hint: contextError?.hint ?? null,
      });
      await supabase.auth.signOut();
      setMessage("Не вдалося перевірити доступ до клубної системи.");
      setIsSubmitting(false);
      return;
    }

    const context = data as PlayerAccessContext;

    if (context.account_status !== "active") {
      await supabase.auth.signOut();
      setMessage("Обліковий запис зараз недоступний.");
      setIsSubmitting(false);
      return;
    }

    await supabase.rpc("record_my_login");

    if (context.must_change_password) {
      router.replace("/account/change-password");
      return;
    }

    navigateAfterLogin(getSafePostLoginPath(context.can_access_admin));
  }

  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">
        <p className="font-bold text-slate-300">Перевіряємо сесію…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 px-5 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <section className="w-full rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur sm:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-sky-400/15 text-4xl">
              ⚽
            </div>

            {loginEnvironment.isNonProduction && (
              <div className="mx-auto mt-5 inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.18em] text-amber-200">
                DEV · Email login
              </div>
            )}

            <p
              className={`text-xs font-black uppercase tracking-[0.28em] text-sky-300 ${
                loginEnvironment.isNonProduction ? "mt-3" : "mt-5"
              }`}
            >
              Олімп Футзал
            </p>

            <h1 className="mt-3 text-3xl font-black">Вхід для гравця</h1>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              {usesEmail
                ? "DEV-середовище: використайте тестовий email та пароль."
                : "Використайте номер телефону, підтверджений клубом, та виданий тимчасовий пароль."}
            </p>
          </div>

          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="mt-8 space-y-5"
          >
            <label className="block">
              <span className="text-sm font-black text-slate-200">
                {usesEmail ? "Email" : "Номер телефону"}
              </span>

              <input
                type={usesEmail ? "email" : "tel"}
                inputMode={usesEmail ? "email" : "tel"}
                autoComplete={usesEmail ? "username" : "tel"}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder={
                  usesEmail ? "dev.player@example.com" : "+380XXXXXXXXX"
                }
                disabled={isSubmitting}
                className="mt-2 min-h-14 w-full rounded-2xl border border-white/10 bg-white/10 px-5 font-bold text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/15"
              />
            </label>

            <label className="block">
              <span className="text-sm font-black text-slate-200">Пароль</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
                className="mt-2 min-h-14 w-full rounded-2xl border border-white/10 bg-white/10 px-5 font-bold text-white outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-400/15"
              />
            </label>

            {message && (
              <p
                role="alert"
                className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-14 w-full items-center justify-center rounded-full bg-sky-400 px-6 font-black text-slate-950 transition enabled:hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Входимо…" : "Увійти"}
            </button>
          </form>

          <div className="mt-7 border-t border-white/10 pt-6 text-center">
            <p className="text-sm text-slate-400">
              {usesEmail
                ? "DEV-доступ призначений лише для тестових облікових записів."
                : "Немає даних для входу? Зверніться до адміністратора команди."}
            </p>

            <Link
              href="/"
              className="mt-4 inline-block text-sm font-black text-sky-300 transition hover:text-sky-200"
            >
              ← На головну
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
