import type { Metadata } from "next";
import Link from "next/link";
import PushAdminForm from "@/components/admin/PushAdminForm";

export const metadata: Metadata = {
  title: "Push-сповіщення",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPushPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-300">
              Олімп Футзал
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Push-сповіщення
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              Надсилайте тестові та командні повідомлення на підписані пристрої.
            </p>
          </div>

          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-5 py-2 text-sm font-black transition hover:border-sky-400 hover:text-sky-300"
          >
            ← До адмінки
          </Link>
        </header>

        <PushAdminForm />

        <p className="mt-6 text-center text-xs leading-5 text-slate-500">
          Тимчасовий захист через окремий секрет адміністратора. Після
          впровадження повної авторизації поле секрету приберемо.
        </p>
      </div>
    </main>
  );
}
