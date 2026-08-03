"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  adminNavigationSections,
  getActiveAdminNavigationHref,
} from "./admin-navigation";

type AdminNavigationListProps = {
  variant: "desktop" | "mobile";
  onNavigate?: () => void;
};

export default function AdminNavigationList({
  variant,
  onNavigate,
}: AdminNavigationListProps) {
  const pathname = usePathname();
  const activeHref = getActiveAdminNavigationHref(pathname);
  const isMobile = variant === "mobile";

  return (
    <ul className="space-y-5">
      {adminNavigationSections.map((section) => {
        const hasActiveItem = section.items.some(
          (item) => item.href === activeHref,
        );

        return (
          <li key={section.id}>
            {section.label && (
              <div
                className={`mb-2 flex items-center gap-3 px-3 ${
                  hasActiveItem ? "text-sky-300" : "text-slate-500"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-sm"
                >
                  {section.icon}
                </span>

                <p className="text-[10px] font-black uppercase tracking-[0.18em]">
                  {section.label}
                </p>
              </div>
            )}

            <ul
              className={
                section.label
                  ? "space-y-1 border-l border-white/10 pl-3"
                  : "space-y-1"
              }
            >
              {section.items.map((item) => {
                const isActive = item.href === activeHref;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 font-black transition ${
                        isMobile ? "min-h-12 text-sm" : "min-h-11 text-[13px]"
                      } ${
                        isActive
                          ? "bg-sky-400 text-slate-950 shadow-lg shadow-sky-400/15"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm ${
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
          </li>
        );
      })}
    </ul>
  );
}
