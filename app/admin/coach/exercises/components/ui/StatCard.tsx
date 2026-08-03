import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: ReactNode;
  description?: string;
  icon?: ReactNode;
  className?: string;
};

export default function StatCard({
  label,
  value,
  description,
  icon,
  className = "",
}: StatCardProps) {
  return (
    <article
      className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ${className}`.trim()}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            {label}
          </p>

          <strong className="mt-3 block text-4xl font-black text-slate-950">
            {value}
          </strong>
        </div>

        {icon ? (
          <div
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"
          >
            {icon}
          </div>
        ) : null}
      </div>

      {description ? (
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
          {description}
        </p>
      ) : null}
    </article>
  );
}
