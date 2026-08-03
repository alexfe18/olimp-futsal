import type { ReactNode } from "react";

type InfoGroupProps = {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  className?: string;
};

export default function InfoGroup({
  eyebrow,
  title,
  children,
  className = "",
}: InfoGroupProps) {
  return (
    <section
      className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ${className}`.trim()}
    >
      {eyebrow ? (
        <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
          {eyebrow}
        </p>
      ) : null}

      <h3 className="mt-2 text-xl font-black text-slate-950">{title}</h3>

      <div className="mt-6 space-y-5">{children}</div>
    </section>
  );
}
