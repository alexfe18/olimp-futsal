"use client";

import Link from "next/link";

import AdminNavigationList from "./AdminNavigationList";

type AdminSidebarProps = {
  adminEmail: string;
  onLogout: () => void;
  isLoggingOut: boolean;
};

export default function AdminSidebar({
  adminEmail,
  onLogout,
  isLoggingOut,
}: AdminSidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col bg-slate-950 text-white lg:flex">
      <div className="border-b border-white/10 px-6 py-7">
        <Link href="/admin" className="block">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-400">
            Олімп Футзал
          </p>
          <p className="mt-2 text-2xl font-black">Адмін-кабінет</p>
        </Link>
      </div>

      <nav
        aria-label="Навігація адміністратора"
        className="flex-1 overflow-y-auto px-4 py-5"
      >
        <AdminNavigationList variant="desktop" />
      </nav>

      <div className="border-t border-white/10 p-4">
        {adminEmail && (
          <div className="mb-4 rounded-2xl bg-white/5 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Адміністратор
            </p>
            <p className="mt-1 truncate text-sm font-bold text-slate-300">
              {adminEmail}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/training"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-slate-300 transition hover:border-sky-400 hover:text-sky-300"
          >
            Сайт
          </Link>

          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoggingOut ? "Вихід..." : "Вийти"}
          </button>
        </div>
      </div>
    </aside>
  );
}
