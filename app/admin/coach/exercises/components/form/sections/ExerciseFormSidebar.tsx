import Image from "next/image";

import Chip from "../../ui/Chip";
import type { ExercisePersistedStatus } from "../types/exercise-form";

type ExerciseFormSidebarProps = {
  title: string;
  category: string;
  difficulty: string;
  durationMinutes: string;
  minPlayers: string;
  maxPlayers: string;
  playerFormat: string;
  selectedGoalLabels: string[];
  coverPreview: string | null;
  diagramPreview: string | null;
  coverFile: File | null;
  diagramFile: File | null;
  videoFile: File | null;
  hasExistingCover: boolean;
  hasExistingDiagram: boolean;
  hasExistingVideo: boolean;
  coverMarkedForRemoval: boolean;
  diagramMarkedForRemoval: boolean;
  videoMarkedForRemoval: boolean;
  status: ExercisePersistedStatus;
};

const statusLabels: Record<ExercisePersistedStatus, string> = {
  draft: "Чернетка",
  active: "Активна",
  archived: "Архів",
};

const statusDotClasses: Record<ExercisePersistedStatus, string> = {
  draft: "bg-amber-400",
  active: "bg-emerald-400",
  archived: "bg-slate-400",
};

export default function ExerciseFormSidebar({
  title,
  category,
  difficulty,
  durationMinutes,
  minPlayers,
  maxPlayers,
  playerFormat,
  selectedGoalLabels,
  coverPreview,
  diagramPreview,
  coverFile,
  diagramFile,
  videoFile,
  hasExistingCover,
  hasExistingDiagram,
  hasExistingVideo,
  coverMarkedForRemoval,
  diagramMarkedForRemoval,
  videoMarkedForRemoval,
  status,
}: ExerciseFormSidebarProps) {
  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="relative flex h-64 items-center justify-center overflow-hidden bg-slate-950">
          {coverPreview ? (
            <Image
              src={coverPreview}
              alt="Попередній перегляд обкладинки"
              fill
              unoptimized={coverPreview.startsWith("blob:")}
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-x-0 top-7 z-10 flex flex-col items-center text-center text-white">
              <div className="text-4xl" aria-hidden="true">
                🏃
              </div>
              <p className="mt-2 text-[11px] font-black uppercase tracking-[0.22em] text-sky-300">
                Попередній перегляд вправи
              </p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 z-10 p-6 text-white">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-sky-400 px-3 py-1 text-xs font-black text-slate-950">
                {category}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white backdrop-blur">
                {difficulty}
              </span>
            </div>
            <h2 className="mt-4 line-clamp-2 text-2xl font-black leading-tight">
              {title.trim() || "Назва нової вправи"}
            </h2>
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-3 gap-2">
            <PreviewMetric label="Час" value={`${durationMinutes || "—"} хв`} />
            <PreviewMetric
              label="Гравці"
              value={
                minPlayers || maxPlayers
                  ? `${minPlayers || "?"}–${maxPlayers || "?"}`
                  : "—"
              }
            />
            <PreviewMetric label="Формат" value={playerFormat || "—"} />
          </div>

          {selectedGoalLabels.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {selectedGoalLabels.slice(0, 5).map((label) => (
                <Chip key={label} size="sm" variant="secondary" disabled>
                  {label}
                </Chip>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm font-semibold text-slate-400">
              Оберіть цілі, щоб вони з’явилися у прев’ю.
            </p>
          )}
        </div>
      </section>

      {diagramPreview ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <SidebarHeading eyebrow="Візуалізація" title="Схема вправи" />
          <div className="relative mt-4 h-64 overflow-hidden rounded-2xl bg-slate-100">
            <Image
              src={diagramPreview}
              alt="Попередній перегляд схеми"
              fill
              unoptimized={diagramPreview.startsWith("blob:")}
              className="object-contain"
            />
          </div>
        </section>
      ) : null}

      <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl">
        <SidebarHeading eyebrow="Медіа" title="Файли вправи" dark />
        <div className="mt-5 space-y-3">
          <FileRow
            label="Обкладинка"
            value={coverFile?.name}
            hasExistingFile={hasExistingCover}
            isMarkedForRemoval={coverMarkedForRemoval}
          />
          <FileRow
            label="Схема"
            value={diagramFile?.name}
            hasExistingFile={hasExistingDiagram}
            isMarkedForRemoval={diagramMarkedForRemoval}
          />
          <FileRow
            label="Відео"
            value={videoFile?.name}
            hasExistingFile={hasExistingVideo}
            isMarkedForRemoval={videoMarkedForRemoval}
          />
        </div>
      </section>

      <section className="rounded-[2rem] border border-sky-200 bg-sky-50 p-6 shadow-sm">
        <SidebarHeading eyebrow="Публікація" title="Статус вправи" />
        <div className="mt-5 flex items-center justify-between rounded-2xl border border-sky-100 bg-white px-4 py-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              Поточний режим
            </p>
            <p className="mt-1 font-black text-slate-950">
              {statusLabels[status]}
            </p>
          </div>
          <span
            className={`size-3 rounded-full ${statusDotClasses[status]}`}
            aria-hidden="true"
          />
        </div>
      </section>
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function SidebarHeading({
  eyebrow,
  title,
  dark = false,
}: {
  eyebrow: string;
  title: string;
  dark?: boolean;
}) {
  return (
    <div>
      <p
        className={`text-xs font-black uppercase tracking-[0.18em] ${
          dark ? "text-sky-400" : "text-sky-600"
        }`}
      >
        {eyebrow}
      </p>
      <h3
        className={`mt-2 text-xl font-black ${dark ? "text-white" : "text-slate-950"}`}
      >
        {title}
      </h3>
    </div>
  );
}

function FileRow({
  label,
  value,
  hasExistingFile,
  isMarkedForRemoval,
}: {
  label: string;
  value?: string;
  hasExistingFile: boolean;
  isMarkedForRemoval: boolean;
}) {
  const displayedValue = isMarkedForRemoval
    ? "Буде видалено"
    : value || (hasExistingFile ? "Завантажено" : "Не обрано");

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/5 px-4 py-3">
      <span className="text-sm font-bold text-slate-300">{label}</span>
      <span
        className={`max-w-[170px] truncate text-right text-sm font-black ${
          isMarkedForRemoval ? "text-rose-300" : "text-white"
        }`}
      >
        {displayedValue}
      </span>
    </div>
  );
}
