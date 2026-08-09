"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { supabase } from "@/lib/supabase";
import {
  validateNewPassword,
  type PlayerAccessContext,
} from "@/lib/auth/player-auth";

export default function FirstSignInPasswordPage() {
  const router = useRouter();

  const [context, setContext] = useState<PlayerAccessContext | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

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
        setMessage("Не вдалося перевірити обліковий запис.");
        setIsLoading(false);
        return;
      }

      const nextContext = data as PlayerAccessContext;

      if (nextContext.account_status !== "active") {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      if (!nextContext.must_change_password) {
        router.replace(nextContext.can_access_admin ? "/admin" : "/player");
        return;
      }

      setContext(nextContext);
      setIsLoading(false);
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const passwordError = validateNewPassword(password);

    if (passwordError) {
      setMessage(passwordError);
      return;
    }

    if (password !== confirmation) {
      setMessage("Паролі не збігаються.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    const { error: passwordUpdateError } = await supabase.auth.updateUser({
      password,
    });

    if (passwordUpdateError) {
      console.error("Password update error:", passwordUpdateError);
      setMessage(
        passwordUpdateError.message ||
          "Не вдалося змінити пароль. Спробуйте ще раз.",
      );
      setIsSaving(false);
      return;
    }

    const { error: completionError } = await supabase.rpc(
      "complete_first_sign_in",
    );

    if (completionError) {
      console.error("First sign-in completion error:", completionError);
      setMessage(
        "Пароль змінено, але профіль ще не завершив активацію. Натисніть кнопку ще раз.",
      );
      setIsSaving(false);
      return;
    }

    const { data: refreshedContext, error: contextError } = await supabase.rpc(
      "get_my_access_context",
    );

    if (contextError || !refreshedContext) {
      setMessage("Пароль змінено. Увійдіть повторно.");
      await supabase.auth.signOut();
      router.replace("/login");
      return;
    }

    const nextContext = refreshedContext as PlayerAccessContext;

    router.replace(nextContext.can_access_admin ? "/admin" : "/player");
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">
        <p className="font-bold text-slate-300">Готуємо перший вхід…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center">
        <section className="w-full rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-600">
            Перший вхід
          </p>
          <h1 className="mt-3 text-3xl font-black">
            Створіть власний пароль
          </h1>
          <p className="mt-4 leading-7 text-slate-600">
            Вітаємо{context?.display_name ? `, ${context.display_name}` : ""}.
            Тимчасовий пароль потрібно замінити перед використанням клубної
            системи.
          </p>

          <form onSubmit={(event) => void handleSubmit(event)} className="mt-8 space-y-5">
            <label className="block">
              <span className="text-sm font-black text-slate-700">
                Новий пароль
              </span>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSaving}
                className="mt-2 min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 font-bold outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-black text-slate-700">
                Повторіть пароль
              </span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                disabled={isSaving}
                className="mt-2 min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 font-bold outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
            </label>

            <div className="rounded-2xl bg-slate-50 px-5 py-4 text-sm leading-6 text-slate-600">
              Мінімум 10 символів. Використовуйте літери та цифри. Не
              використовуйте тимчасовий пароль повторно.
            </div>

            {message && (
              <p
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-h-14 w-full items-center justify-center rounded-full bg-slate-950 px-6 font-black text-white transition enabled:hover:bg-sky-500 enabled:hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Зберігаємо…" : "Змінити пароль і продовжити"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
