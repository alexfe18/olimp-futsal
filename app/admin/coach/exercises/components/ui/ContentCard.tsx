import type { ReactNode } from "react";

type ContentCardProps = {
  icon?: ReactNode;
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  footer?: ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
  className?: string;
  contentClassName?: string;
};

export default function ContentCard({
  icon,
  eyebrow,
  title,
  children,
  footer,
  isEmpty = false,
  emptyMessage = "Інформацію поки не додано.",
  className = "",
  contentClassName = "",
}: ContentCardProps) {
  return (
    <section
      className={`overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm ${className}`.trim()}
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-start gap-4">
          {icon ? (
            <div
              aria-hidden="true"
              className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-xl text-sky-700"
            >
              {icon}
            </div>
          ) : null}

          <div className="min-w-0 flex-1">
            {eyebrow ? (
              <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
                {eyebrow}
              </p>
            ) : null}

            <h2
              className={`text-2xl font-black leading-tight text-slate-950 ${
                eyebrow ? "mt-2" : ""
              }`}
            >
              {title}
            </h2>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-6">
          {isEmpty ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6">
              <p className="text-sm font-semibold leading-6 text-slate-400">
                {emptyMessage}
              </p>
            </div>
          ) : (
            <div
              className={`whitespace-pre-wrap text-base font-semibold leading-8 text-slate-600 ${contentClassName}`.trim()}
            >
              {children}
            </div>
          )}
        </div>
      </div>

      {footer ? (
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 sm:px-8">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
