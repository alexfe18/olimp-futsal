import type { ReactNode } from "react";

export type PropertyItem = {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
};

type PropertyGridProps = {
  items: PropertyItem[];
  className?: string;
  itemClassName?: string;
};

export default function PropertyGrid({
  items,
  className = "",
  itemClassName = "",
}: PropertyGridProps) {
  return (
    <div
      className={`grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 ${className}`.trim()}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={`min-w-0 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10 backdrop-blur ${itemClassName}`.trim()}
        >
          <div className="flex items-center gap-2">
            {item.icon ? (
              <span
                aria-hidden="true"
                className="flex shrink-0 items-center text-sky-300"
              >
                {item.icon}
              </span>
            ) : null}

            <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              {item.label}
            </p>
          </div>

          <div className="mt-1 truncate text-sm font-black text-white">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
