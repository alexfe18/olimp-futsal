"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import AdminNavigationList from "./AdminNavigationList";

type AdminMobileHeaderProps = {
  isOpen: boolean;
  adminEmail: string;
  isLoggingOut: boolean;
  onOpen: () => void;
  onClose: () => void;
  onLogout: () => void;
};

export default function AdminMobileHeader({
  isOpen,
  adminEmail,
  isLoggingOut,
  onOpen,
  onClose,
  onLogout,
}: AdminMobileHeaderProps) {
  const pathname = usePathname();

  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <Link href="/admin" className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-sky-600">
              Олімп Футзал
            </p>

            <p className="mt-0.5 truncate text-lg font-black text-slate-950">
              Адмін-кабінет
            </p>
          </Link>

          <button
            type="button"
            onClick={onOpen}
            aria-label="Відкрити меню адміністратора"
            aria-expanded={isOpen}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-xl font-black text-white"
          >
            ☰
          </button>
        </div>
      </header>

      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Закрити меню"
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
          />

          <aside className="absolute inset-y-0 right-0 flex w-[min(88vw,23rem)] flex-col bg-slate-950 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-400">
                  Олімп Футзал
                </p>

                <p className="mt-1 text-xl font-black">Меню</p>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Закрити меню"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-2xl"
              >
                ×
              </button>
            </div>

            <nav
              aria-label="Мобільна навігація адміністратора"
              className="flex-1 overflow-y-auto px-4 py-5"
            >
              <AdminNavigationList variant="mobile" onNavigate={onClose} />
            </nav>

            <div className="border-t border-white/10 p-4">
              {adminEmail && (
                <p className="mb-4 truncate text-sm text-slate-400">
                  {adminEmail}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/training"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 px-4 py-3 text-sm font-black"
                >
                  Відкрити сайт
                </Link>

                <button
                  type="button"
                  onClick={onLogout}
                  disabled={isLoggingOut}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-60"
                >
                  {isLoggingOut ? "Вихід..." : "Вийти"}
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
