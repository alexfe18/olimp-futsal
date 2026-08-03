"use client";

import type { ExerciseWorkspaceHeroProps } from "../types/types";

export default function ExerciseWorkspaceHero({
  badge,
  title,
  description,
  actions,
}: ExerciseWorkspaceHeroProps) {
  return (
    <section className="overflow-hidden rounded-[2rem] bg-slate-950 px-8 py-10 text-white shadow-xl">
      {badge}

      <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-sky-400">
        Робочий простір тренера
      </p>

      <h1 className="mt-4 text-5xl font-black tracking-tight">{title}</h1>

      <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
        {description}
      </p>

      {actions ? (
        <div className="mt-8 flex flex-wrap gap-3">{actions}</div>
      ) : null}
    </section>
  );
}
