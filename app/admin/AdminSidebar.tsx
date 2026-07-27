"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminSidebarProps = {
  adminEmail: string;
  onLogout: () => void;
  isLoggingOut: boolean;
};

const navigationItems = [
  {
    href: "/admin",
    label: "Огляд",
    icon: "⌂",
  },
  {
    href: "/admin/trainings",
    label: "Тренування",
    icon: "📅",
  },
  {
    href: "/admin/matches",
    label: "Матчі",
    icon: "⚽",
  },
  {
    href: "/admin/players",
    label: "Гравці",
    icon: "👥",
  },
  {
    href: "/admin/attendance",
    label: "Відвідуваність",
    icon: "📊",
  },
  {
    href: "/admin/statistics",
    label: "Статистика",
    icon: "📈",
  },
  {
    href: "/admin/competitions",
    label: "Змагання",
    icon: "🏆",
  },
  {
    href: "/admin/push",
    label: "Push-сповіщення",
    icon: "📢",
  },
  {
    href: "/admin/news",
    label: "Новини",
    icon: "📝",
  },
  {
    href: "/admin/gallery",
    label: "Галерея",
    icon: "🖼️",
  },
  {
    href: "/admin/settings",
    label: "Налаштування",
    icon: "⚙️",
  },
];

function isNavigationItemActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebar({
  adminEmail,
  onLogout,
  isLoggingOut,
}: AdminSidebarProps) {
  const pathname = usePathname();

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
        <ul className="space-y-1.5">
          {navigationItems.map((item) => {
            const isActive = isNavigationItemActive(pathname, item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition ${
                    isActive
                      ? "bg-sky-400 text-slate-950 shadow-lg shadow-sky-400/20"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-base ${
                      isActive ? "bg-slate-950/10" : "bg-white/5"
                    }`}
                  >
                    {item.icon}
                  </span>

                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
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
