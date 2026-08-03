import Image from "next/image";
import type { ReactNode } from "react";

type HeroCardProps = {
  title: string;
  eyebrow?: string;
  description?: string | null;
  imageUrl?: string | null;
  imageAlt?: string;
  badges?: ReactNode;
  code?: ReactNode;
  meta?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export default function HeroCard({
  title,
  eyebrow,
  description,
  imageUrl,
  imageAlt = "",
  badges,
  code,
  meta,
  footer,
  className = "",
}: HeroCardProps) {
  return (
    <section
      className={`relative overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-xl ${className}`.trim()}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-40"
        />
      ) : (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-24 -top-32 size-96 rounded-full border border-sky-400/15" />
          <div className="absolute -bottom-40 -left-24 size-[28rem] rounded-full bg-sky-400/10 blur-3xl" />
          <div className="absolute right-[18%] top-[18%] size-20 rounded-full border border-white/5" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/95 to-slate-950/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />

      <div className="relative flex min-h-[430px] flex-col justify-between p-7 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap gap-2">{badges}</div>
          {code ? <div className="shrink-0">{code}</div> : null}
        </div>

        <div className="mt-16">
          {eyebrow ? (
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300">
              {eyebrow}
            </p>
          ) : null}

          <h1 className="mt-3 max-w-5xl text-4xl font-black tracking-tight sm:text-6xl">
            {title}
          </h1>

          {description ? (
            <p className="mt-5 max-w-4xl text-base font-semibold leading-7 text-slate-300 sm:text-lg sm:leading-8">
              {description}
            </p>
          ) : null}

          {meta ? <div className="mt-7">{meta}</div> : null}
          {footer ? <div className="mt-6">{footer}</div> : null}
        </div>
      </div>
    </section>
  );
}
