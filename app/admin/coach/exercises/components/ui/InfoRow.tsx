import type { ReactNode } from "react";

type InfoRowProps = {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  description?: string;
  className?: string;
};

export default function InfoRow({
  label,
  value,
  icon,
  description,
  className = "",
}: InfoRowProps) {
  return (
    <div
      className={`flex items-start justify-between gap-4 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0 ${className}`.trim()}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500"
          >
            {icon}
          </span>
        ) : null}

        <div className="min-w-0">
          <dt className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            {label}
          </dt>

          {description ? (
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      <dd className="max-w-[55%] break-words text-right text-sm font-black text-slate-950">
        {value}
      </dd>
    </div>
  );
}
