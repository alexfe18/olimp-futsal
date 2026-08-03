import PlayerIcon from "./PlayerIcon";
import { statusOptions } from "./constants";
import type { AttendanceRecord, AttendanceStatus } from "./types";
import { formatAttendanceUpdate, normalizePlayerName } from "./utils";

type GroupedAttendance = Record<AttendanceStatus, AttendanceRecord[]>;

type AttendanceListProps = {
  groupedAttendance: GroupedAttendance;
  currentPlayerName: string;
  isLoading: boolean;
};

export default function AttendanceList({
  groupedAttendance,
  currentPlayerName,
  isLoading,
}: AttendanceListProps) {
  return (
    <div className="mt-5 grid gap-4 md:grid-cols-3">
      {statusOptions.map((option) => {
        const records = groupedAttendance[option.value];

        return (
          <article
            key={option.value}
            className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-black text-slate-950">{option.groupLabel}</h3>

              <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-sky-100 px-3 text-sm font-black text-sky-700 transition-all duration-300">
                {records.length}
              </span>
            </div>

            <div className="mt-5">
              {isLoading ? (
                <p className="text-sm leading-6 text-slate-400">
                  Завантаження...
                </p>
              ) : records.length > 0 ? (
                <ul className="space-y-3">
                  {records.map((record) => {
                    const isCurrentPlayer =
                      normalizePlayerName(record.name) ===
                      normalizePlayerName(currentPlayerName);

                    const formattedRecordUpdate = formatAttendanceUpdate(
                      record.updatedAt,
                    );

                    const recordStatusLabel =
                      statusOptions.find(
                        (statusOption) => statusOption.value === record.status,
                      )?.label ?? "—";

                    return (
                      <li
                        key={record.id}
                        aria-label={`Гравець: ${record.name}. Відповідь: ${recordStatusLabel}. Оновлено: ${formattedRecordUpdate}`}
                        tabIndex={0}
                        className={`group/player relative flex cursor-help items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-sky-400 ${
                          isCurrentPlayer
                            ? "bg-sky-100 text-sky-900 ring-2 ring-sky-200"
                            : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                          <PlayerIcon />
                        </span>

                        <span className="min-w-0 flex-1 truncate">
                          {record.name}
                        </span>

                        {isCurrentPlayer && (
                          <span className="ml-auto shrink-0 text-xs font-black uppercase tracking-wide text-sky-700">
                            Ви
                          </span>
                        )}

                        <span
                          role="tooltip"
                          className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-30 hidden w-max max-w-[260px] -translate-x-1/2 rounded-xl bg-slate-950 px-4 py-3 text-left text-xs font-medium leading-5 text-white shadow-xl group-hover/player:block group-focus-within/player:block"
                        >
                          <strong className="block text-sm font-black">
                            {record.name}
                          </strong>

                          <span className="mt-1 block text-slate-300">
                            Відповідь: {recordStatusLabel}
                          </span>

                          <span className="block text-slate-400">
                            Оновлено: {formattedRecordUpdate}
                          </span>

                          <span
                            aria-hidden="true"
                            className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-950"
                          />
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm leading-6 text-slate-400">
                  Відповідей поки немає.
                </p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
