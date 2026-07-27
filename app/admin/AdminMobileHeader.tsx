"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

type AdminMobileHeaderProps = {
  isOpen: boolean;
  adminEmail: string;
  isLoggingOut: boolean;
  onOpen: () => void;
  onClose: () => void;
  onLogout: () => void;
};

const navigationItems = [
  { href: "/admin", label: "Огляд", icon: "⌂" },
  { href: "/admin/trainings", label: "Тренування", icon: "📅" },
  { href: "/admin/matches", label: "Матчі", icon: "⚽" },
  { href: "/admin/players", label: "Гравці", icon: "👥" },
  { href: "/admin/attendance", label: "Відвідуваність", icon: "📊" },
  { href: "/admin/statistics", label: "Статистика", icon: "📈" },
  { href: "/admin/competitions", label: "Змагання", icon: "🏆" },
  { href: "/admin/push", label: "Push-сповіщення", icon: "📢" },
  { href: "/admin/news", label: "Новини", icon: "📝" },
  { href: "/admin/gallery", label: "Галерея", icon: "🖼️" },
  { href: "/admin/settings", label: "Налаштування", icon: "⚙️" },
];

function isNavigationItemActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

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

            <nav className="flex-1 overflow-y-auto px-4 py-5">
              <ul className="space-y-1.5">
                {navigationItems.map((item) => {
                  const isActive = isNavigationItemActive(pathname, item.href);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black ${
                          isActive
                            ? "bg-sky-400 text-slate-950"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10"
                        >
                          {item.icon}
                        </span>

                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
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
