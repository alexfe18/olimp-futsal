import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export default function EmptyState({
  title,
  description,
  icon,
  actions,
  className = "",
}: EmptyStateProps) {
  return (
    <section
      className={`rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm ${className}`.trim()}
    >
      {icon ? (
        <div
          aria-hidden="true"
          className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-slate-100 text-4xl"
        >
          {icon}
        </div>
      ) : null}

      <h2 className="mt-5 text-3xl font-black text-slate-950">{title}</h2>

      {description ? (
        <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-500">
          {description}
        </p>
      ) : null}

      {actions ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actions}
        </div>
      ) : null}
    </section>
  );
}
