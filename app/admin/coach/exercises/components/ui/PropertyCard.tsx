import type { ReactNode } from "react";

type PropertyCardProps = {
  icon?: ReactNode;
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export default function PropertyCard({
  icon,
  eyebrow,
  title,
  children,
  footer,
  className = "",
}: PropertyCardProps) {
  return (
    <section
      className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ${className}`.trim()}
    >
      <div className="flex items-start gap-4">
        {icon ? (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-xl">
            {icon}
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
              {eyebrow}
            </p>
          ) : null}

          <h3 className="mt-1 text-lg font-black text-slate-950">{title}</h3>
        </div>
      </div>

      <div className="mt-5">{children}</div>

      {footer ? (
        <div className="mt-5 border-t border-slate-100 pt-4">{footer}</div>
      ) : null}
    </section>
  );
}
