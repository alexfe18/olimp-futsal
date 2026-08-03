"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";

const photos = [
  {
    src: "/images/gallery-1.jpg",
    alt: "Команда Олімп Футзал",
    className: "md:col-span-2 md:row-span-2",
  },
  {
    src: "/images/gallery-2.jpg",
    alt: "Матч Олімп Футзал",
    className: "",
  },
  {
    src: "/images/gallery-3.jpg",
    alt: "Нагородження команди",
    className: "",
  },
  {
    src: "/images/gallery-4.jpg",
    alt: "Командне фото",
    className: "md:col-span-2",
  },
  {
    src: "/images/gallery-5.jpg",
    alt: "Олімп Футзал разом",
    className: "",
  },
  {
    src: "/images/gallery-6.jpg",
    alt: "Тренувальний процес",
    className: "",
  },
  {
    src: "/images/gallery-7.jpg",
    alt: "Емоції після матчу",
    className: "",
  },
  {
    src: "/images/gallery-8.jpg",
    alt: "Доросла та юнацька команди",
    className: "md:col-span-2",
  },
];

export default function Gallery() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const closeLightbox = () => {
    setActiveIndex(null);
  };

  const showPrevious = () => {
    setActiveIndex((current) => {
      if (current === null) {
        return null;
      }

      return current === 0 ? photos.length - 1 : current - 1;
    });
  };

  const showNext = () => {
    setActiveIndex((current) => {
      if (current === null) {
        return null;
      }

      return current === photos.length - 1 ? 0 : current + 1;
    });
  };

  useEffect(() => {
    if (activeIndex === null) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeLightbox();
      }

      if (event.key === "ArrowLeft") {
        showPrevious();
      }

      if (event.key === "ArrowRight") {
        showNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex]);

  const activePhoto = activeIndex !== null ? photos[activeIndex] : null;

  return (
    <>
      <section
        id="gallery"
        className="scroll-mt-24 bg-slate-950 px-6 py-24 text-white lg:px-10 lg:py-32"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid items-end gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.28em] text-sky-400">
                Галерея
              </p>

              <h2 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Команда в кадрі
              </h2>
            </div>

            <p className="max-w-2xl text-lg leading-8 text-slate-300">
              Матчі, тренування, перемоги та моменти, які створюють історію
              «Олімп Футзал».
            </p>
          </div>

          <div className="mt-16 grid auto-rows-[260px] grid-cols-1 gap-4 sm:grid-cols-2 md:auto-rows-[280px] md:grid-cols-4">
            {photos.map((photo, index) => (
              <button
                key={photo.src}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Відкрити фото: ${photo.alt}`}
                className={`group relative overflow-hidden rounded-3xl bg-slate-900 text-left outline-none transition duration-300 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950 ${photo.className}`}
              >
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition duration-700 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/10 to-transparent opacity-70 transition duration-300 group-hover:opacity-95" />

                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
                  <span className="text-sm font-bold text-white sm:text-base">
                    {photo.alt}
                  </span>

                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white opacity-0 backdrop-blur-md transition duration-300 group-hover:scale-100 group-hover:opacity-100">
                    <svg
                      viewBox="0 0 24 24"
                      width="22"
                      height="22"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        cx="11"
                        cy="11"
                        r="6"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M16 16L21 21"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M11 8V14M8 11H14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <Link
              href="/gallery"
              className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/20 bg-white/10 px-8 py-4 font-black text-white backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-sky-400 hover:bg-sky-400 hover:text-slate-950"
            >
              Переглянути всю галерею
            </Link>
          </div>
        </div>
      </section>

      {activePhoto && activeIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 px-4 py-6 backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-label={activePhoto.alt}
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={closeLightbox}
            aria-label="Закрити галерею"
            className="absolute right-4 top-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:right-7 sm:top-7"
          >
            <svg
              viewBox="0 0 24 24"
              width="25"
              height="25"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 6L18 18M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              showPrevious();
            }}
            aria-label="Попереднє фото"
            className="absolute left-3 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:left-7 sm:h-14 sm:w-14"
          >
            <svg
              viewBox="0 0 24 24"
              width="26"
              height="26"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M15 6L9 12L15 18"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div
            className="relative flex h-[78vh] w-full max-w-6xl items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              src={activePhoto.src}
              alt={activePhoto.alt}
              fill
              priority
              sizes="100vw"
              className="object-contain"
            />

            <div className="absolute inset-x-0 bottom-0 flex justify-center px-6 pb-4">
              <div className="rounded-full bg-slate-950/70 px-5 py-2 text-center text-sm font-bold text-white backdrop-blur">
                {activePhoto.alt}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              showNext();
            }}
            aria-label="Наступне фото"
            className="absolute right-3 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:right-7 sm:h-14 sm:w-14"
          >
            <svg
              viewBox="0 0 24 24"
              width="26"
              height="26"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M9 6L15 12L9 18"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
