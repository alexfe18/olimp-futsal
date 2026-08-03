import type { ReactNode } from "react";

type MetricProps = {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export default function Metric({
  label,
  value,
  icon,
  className = "",
}: MetricProps) {
  return (
    <div className={`rounded-2xl bg-slate-50 px-3 py-3 ${className}`.trim()}>
      <div className="flex items-center gap-2">
        {icon ? (
          <span
            aria-hidden="true"
            className="flex shrink-0 items-center text-slate-400"
          >
            {icon}
          </span>
        ) : null}

        <p className="truncate text-[10px] font-black uppercase tracking-wider text-slate-400">
          {label}
        </p>
      </div>

      <div className="mt-1 truncate text-sm font-black text-slate-950">
        {value}
      </div>
    </div>
  );
}
