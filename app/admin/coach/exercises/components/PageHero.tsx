import type { ReactNode } from "react";

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export default function PageHero({
  eyebrow,
  title,
  description,
  actions,
  children,
  className = "",
}: PageHeroProps) {
  return (
    <section
      className={`overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-8 lg:px-10 ${className}`.trim()}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-400">
              {eyebrow}
            </p>
          ) : null}

          <h1
            className={`${eyebrow ? "mt-4" : ""} text-4xl font-black tracking-tight sm:text-5xl`}
          >
            {title}
          </h1>

          {description ? (
            <p className="mt-4 max-w-3xl leading-7 text-slate-300">
              {description}
            </p>
          ) : null}

          {children ? <div className="mt-6">{children}</div> : null}
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>
        ) : null}
      </div>
    </section>
  );
}
