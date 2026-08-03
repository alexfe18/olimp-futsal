import type { ReactNode } from "react";

type Props = {
  eyebrow: string;
  title: string;
  children: ReactNode;
  className?: string;
};

export default function ExerciseContentSection({
  eyebrow,
  title,
  children,
  className = "",
}: Props) {
  return (
    <section
      className={`rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 ${className}`.trim()}
    >
      <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-black">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}
