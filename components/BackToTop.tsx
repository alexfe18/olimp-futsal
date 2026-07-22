"use client";

import { useEffect, useState } from "react";

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 200);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    window.history.replaceState(null, "", window.location.pathname);
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Повернутися нагору"
      className={`fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-sky-400 text-slate-950 shadow-[0_12px_35px_rgba(56,189,248,0.4)] transition-all duration-300 active:scale-90 sm:bottom-7 sm:right-7 sm:h-14 sm:w-14 sm:hover:-translate-y-1 sm:hover:bg-sky-300 ${
        isVisible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        width="25"
        height="25"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M6 15L12 9L18 15"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
