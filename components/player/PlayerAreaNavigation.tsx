"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { usePlayerSession } from "@/components/auth/PlayerAccessGate";

const navigation = [
  {
    href: "/player",
    label: "Головна",
    shortLabel: "Головна",
    exact: true,
  },
  {
    href: "/player/calendar",
    label: "Календар",
    shortLabel: "Календар",
    exact: false,
  },
  {
    href: "/player/trainings",
    label: "Тренування",
    shortLabel: "Тренування",
    exact: false,
  },
  {
    href: "/player/matches",
    label: "Матчі",
    shortLabel: "Матчі",
    exact: false,
  },
  {
    href: "/player/profile",
    label: "Профіль",
    shortLabel: "Профіль",
    exact: false,
  },
] as const;

function isActivePath(pathname: string, href: string, exact: boolean) {
  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PlayerAreaNavigation() {
  const pathname = usePathname();
  const { context, logout } = usePlayerSession();

  return (
    <>
      <header className="border-b border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-5 py-4">
          <Link href="/player" className="min-w-0">
            <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-sky-400">
              Олімп Футзал
            </span>
            <span className="mt-1 block truncate text-sm font-black text-white">
              Кабінет гравця
            </span>
          </Link>

          <nav className="hidden items-center gap-2 md:flex" aria-label="Навігація гравця">
            {navigation.map((item) => {
              const active = isActivePath(pathname, item.href, item.exact);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-4 py-2 text-sm font-black transition ${
                    active
                      ? "bg-white text-slate-950"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-48 truncate text-sm font-black">
                {context.display_name}
              </p>
              <p className="max-w-48 truncate text-xs text-slate-400">
                {context.team?.name ?? "Олімп Футзал"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/20 px-4 text-sm font-black text-white transition hover:bg-white/10"
            >
              Вийти
            </button>
          </div>
        </div>
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur md:hidden"
        aria-label="Мобільна навігація гравця"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {navigation.map((item) => {
            const active = isActivePath(pathname, item.href, item.exact);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 items-center justify-center rounded-2xl px-1 text-[0.61rem] font-black transition sm:text-[0.68rem] ${
                  active
                    ? "bg-slate-950 text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                {item.shortLabel}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
