"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (session) {
        router.replace("/admin");
        return;
      }

      setIsCheckingSession(false);
    }

    void checkSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setMessage("Введіть email і пароль.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      console.error("Admin login error:", error);
      setMessage("Невірний email або пароль.");
      setIsSubmitting(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-300">
          Перевірка авторизації...
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
      <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-900 p-7 shadow-2xl sm:p-10">
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-sky-400">
            Олімп Футзал
          </p>

          <h1 className="mt-4 text-3xl font-black">Вхід до адмін-панелі</h1>

          <p className="mt-4 text-sm leading-6 text-slate-400">
            Використовуйте обліковий запис адміністратора, створений у Supabase.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8">
          <label
            htmlFor="admin-email"
            className="text-sm font-black uppercase tracking-[0.16em] text-slate-300"
          >
            Email
          </label>

          <input
            id="admin-email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setMessage("");
            }}
            autoComplete="email"
            placeholder="admin@example.com"
            className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none transition placeholder:text-slate-600 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10"
          />

          <label
            htmlFor="admin-password"
            className="mt-6 block text-sm font-black uppercase tracking-[0.16em] text-slate-300"
          >
            Пароль
          </label>

          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setMessage("");
            }}
            autoComplete="current-password"
            placeholder="Ваш пароль"
            className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none transition placeholder:text-slate-600 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-7 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-sky-400 px-6 py-4 font-black text-slate-950 transition enabled:hover:-translate-y-0.5 enabled:hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Вхід..." : "Увійти"}
          </button>

          {message && (
            <p
              role="alert"
              className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200"
            >
              {message}
            </p>
          )}
        </form>

        <Link
          href="/"
          className="mt-7 block text-center text-sm font-bold text-slate-400 transition hover:text-sky-300"
        >
          ← Повернутися на сайт
        </Link>
      </section>
    </main>
  );
}
