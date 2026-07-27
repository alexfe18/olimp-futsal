"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";

type NavigationItem = {
  label: string;
  href: string;
  id: string;
  type: "section" | "page";
};

const navigation: NavigationItem[] = [
  {
    label: "Про клуб",
    href: "/#about",
    id: "about",
    type: "section",
  },
  {
    label: "Історія",
    href: "/#history",
    id: "history",
    type: "section",
  },
  {
    label: "Досягнення",
    href: "/#achievements",
    id: "achievements",
    type: "section",
  },
  {
    label: "Тренування",
    href: "/training",
    id: "training",
    type: "page",
  },
  {
    label: "Новини",
    href: "/news",
    id: "news",
    type: "page",
  },
  {
    label: "Галерея",
    href: "/gallery",
    id: "gallery",
    type: "page",
  },
  {
    label: "Контакти",
    href: "/#contacts",
    id: "contacts",
    type: "section",
  },
];

export default function Header() {
  const pathname = usePathname();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const activationPoint = scrollPosition + 180;

      setIsScrolled(scrollPosition > 20);

      if (pathname !== "/") {
        setActiveSection("");
        return;
      }

      if (scrollPosition < 250) {
        setActiveSection("");
        return;
      }

      let currentSection = "";

      for (const item of navigation) {
        if (item.type !== "section") {
          continue;
        }

        const section = document.getElementById(item.id);

        if (section && section.offsetTop <= activationPoint) {
          currentSection = item.id;
        }
      }

      setActiveSection(currentSection);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleNavigationClick = (
    event: MouseEvent<HTMLAnchorElement>,
    item: NavigationItem,
  ) => {
    closeMenu();

    if (item.type !== "section" || pathname !== "/") {
      return;
    }

    const section = document.getElementById(item.id);

    if (!section) {
      return;
    }

    event.preventDefault();

    section.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    window.history.replaceState(null, "", `/#${item.id}`);
  };

  const isItemActive = (item: NavigationItem) => {
    if (item.type === "section") {
      return pathname === "/" && activeSection === item.id;
    }

    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 w-full">
      <div
        className={`absolute inset-0 transition-all duration-700 ease-in-out ${
          isScrolled || isMenuOpen
            ? "bg-slate-950/95 backdrop-blur-xl"
            : "bg-transparent backdrop-blur-none"
        }`}
      />

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-8 translate-y-full bg-gradient-to-b from-slate-950/20 to-transparent transition-opacity duration-700 ${
          isScrolled ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        className={`relative mx-auto flex max-w-7xl items-center justify-between px-5 transition-all duration-500 ease-in-out sm:px-6 lg:px-10 ${
          isScrolled ? "py-2.5" : "py-4"
        }`}
      >
        <Link
          href="/"
          onClick={closeMenu}
          className="flex min-w-0 items-center gap-3"
        >
          <Image
            src="/images/olimp-logo.png"
            alt="Олімп Футзал"
            width={54}
            height={54}
            priority
            className={`shrink-0 object-contain transition-all duration-500 ease-in-out ${
              isScrolled
                ? "h-10 w-10 sm:h-11 sm:w-11"
                : "h-12 w-12 sm:h-[54px] sm:w-[54px]"
            }`}
          />

          <span
            className={`whitespace-nowrap font-extrabold text-white transition-all duration-500 ${
              isScrolled ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"
            }`}
          >
            Олімп Футзал
          </span>
        </Link>

        {/* Desktop menu */}
        <nav className="hidden items-center gap-5 text-sm font-semibold text-white lg:flex xl:gap-7">
          {navigation.map((item) => {
            const isActive = isItemActive(item);

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={(event) => handleNavigationClick(event, item)}
                className={`relative whitespace-nowrap py-2 transition-colors duration-300 ${
                  isActive ? "text-sky-300" : "text-white hover:text-sky-300"
                }`}
              >
                {item.label}

                <span
                  className={`absolute inset-x-0 -bottom-0.5 h-0.5 origin-left rounded-full bg-sky-400 transition-transform duration-300 ${
                    isActive ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        {/* Mobile and tablet menu button */}
        <button
          type="button"
          aria-label={isMenuOpen ? "Закрити меню" : "Відкрити меню"}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((current) => !current)}
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 lg:hidden"
        >
          <span className="sr-only">
            {isMenuOpen ? "Закрити меню" : "Відкрити меню"}
          </span>

          <span className="relative block h-5 w-6">
            <span
              className={`absolute left-0 top-0 h-0.5 w-6 rounded-full bg-white transition-all duration-300 ${
                isMenuOpen ? "translate-y-[9px] rotate-45" : ""
              }`}
            />

            <span
              className={`absolute left-0 top-[9px] h-0.5 w-6 rounded-full bg-white transition-all duration-300 ${
                isMenuOpen ? "opacity-0" : "opacity-100"
              }`}
            />

            <span
              className={`absolute bottom-0 left-0 h-0.5 w-6 rounded-full bg-white transition-all duration-300 ${
                isMenuOpen ? "-translate-y-[9px] -rotate-45" : ""
              }`}
            />
          </span>
        </button>
      </div>

      {/* Mobile and tablet menu */}
      <div
        className={`relative overflow-hidden bg-slate-950/98 backdrop-blur-xl transition-all duration-500 ease-in-out lg:hidden ${
          isMenuOpen
            ? "max-h-[760px] opacity-100"
            : "pointer-events-none max-h-0 opacity-0"
        }`}
      >
        <nav className="flex max-h-[calc(100svh-80px)] flex-col overflow-y-auto px-6 pb-8 pt-3">
          {navigation.map((item) => {
            const isActive = isItemActive(item);

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={(event) => handleNavigationClick(event, item)}
                className={`border-b border-white/10 py-4 text-lg font-bold transition ${
                  isActive ? "text-sky-300" : "text-white hover:text-sky-300"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
