import Link from "next/link";
import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-slate-950 text-white lg:min-h-screen">
      <Image
        src="/images/hero-team.jpg"
        alt="Команда Олімп Футзал перед матчем"
        fill
        priority
        sizes="100vw"
        className="object-cover object-[64%_center] sm:object-[60%_center] lg:object-center"
      />

      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/65 to-slate-950/5 lg:via-slate-950/55 lg:to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/5 to-slate-950/10" />
      <div className="absolute inset-0 bg-slate-950/10 lg:hidden" />
      <div className="absolute -left-32 top-1/3 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl" />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl items-start px-6 pb-14 pt-28 sm:px-8 sm:pb-20 sm:pt-32 md:pb-24 md:pt-32 lg:min-h-screen lg:items-center lg:px-10 lg:pb-24 lg:pt-32">
        <div className="max-w-3xl">
          <p className="mb-4 max-w-[300px] text-xs font-black uppercase leading-6 tracking-[0.25em] text-sky-300 sm:max-w-none sm:text-sm sm:tracking-[0.3em]">
            Футзальна команда з Миколаєва
          </p>

          <h1 className="max-w-[350px] text-[3.35rem] font-black leading-[0.95] tracking-[-0.055em] text-white sm:max-w-2xl sm:text-6xl md:text-7xl lg:text-8xl">
            Разом до вершин
          </h1>

          <p className="mt-6 max-w-[370px] text-lg leading-8 text-slate-200 sm:max-w-2xl sm:text-xl sm:leading-9">
            Розвиваємо футзал у Миколаєві, підтримуємо молодих гравців та
            створюємо команду з характером, амбіціями й майбутнім.
          </p>

          <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:mt-10 sm:max-w-none sm:flex-row sm:gap-4">
            <Link
              href="/#about"
              className="inline-flex min-h-14 items-center justify-center rounded-full bg-sky-400 px-7 py-4 text-center text-base font-black text-slate-950 shadow-[0_12px_40px_rgba(56,189,248,0.28)] transition duration-300 hover:-translate-y-0.5 hover:bg-sky-300 hover:shadow-[0_16px_45px_rgba(56,189,248,0.38)]"
            >
              Дізнатися про клуб
            </Link>

            <Link
              href="/gallery"
              className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/35 bg-white/10 px-7 py-4 text-center text-base font-black text-white backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:border-white/60 hover:bg-white/20"
            >
              Переглянути фото
            </Link>
          </div>
        </div>
      </div>

      <a
        href="#stats"
        aria-label="Прокрутити до статистики"
        className="absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/65 transition hover:text-white lg:flex"
      >
        <span>Гортати</span>
        <span className="flex h-10 w-6 justify-center rounded-full border border-white/35 pt-2">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-300" />
        </span>
      </a>
    </section>
  );
}
