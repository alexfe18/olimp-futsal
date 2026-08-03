import type { Exercise } from "../types";
import { formatDate, libraryTierLabels } from "../utils";

import Chip from "../../components/ui/Chip";
import InfoGroup from "../../components/ui/InfoGroup";
import InfoRow from "../../components/ui/InfoRow";
import PropertyCard from "../../components/ui/PropertyCard";
import TagCloud from "../../components/ui/TagCloud";

type ExerciseSidebarProps = {
  exercise: Exercise;
};


export default function ExerciseSidebar({ exercise }: ExerciseSidebarProps) {
  const tags = exercise.exercise_tags.map((tag) => `#${tag.tag}`);

  const libraryTierLabel = exercise.library_tier
    ? (libraryTierLabels[exercise.library_tier] ?? exercise.library_tier)
    : "Не вказано";

  const importSource = exercise.source?.trim() || null;
  const dataOriginLabel = importSource ? "Імпорт" : "Ручне створення";

  return (
    <aside className="space-y-6 xl:sticky xl:top-6">
      <PropertyCard icon="👥" eyebrow="Гравці" title="Вікові групи">
        {exercise.age_groups.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {exercise.age_groups.map((ageGroup) => (
              <Chip
                key={ageGroup}
                variant="secondary"
                size="sm"
                tabIndex={-1}
                aria-label={`Вікова група ${ageGroup}`}
              >
                {ageGroup}
              </Chip>
            ))}
          </div>
        ) : (
          <EmptyProperty message="Вікові групи ще не вказано." />
        )}
      </PropertyCard>

      <PropertyCard icon="🏷️" eyebrow="Класифікація" title="Теги">
        <TagCloud
          tags={tags}
          variant="secondary"
          size="sm"
          emptyMessage="Теги для цієї вправи ще не додано."
        />
      </PropertyCard>

      <PropertyCard icon="⭐" eyebrow="Бібліотека" title="Властивості вправи">
        <dl className="space-y-4">
          <InfoRow
            label="Рівень бібліотеки"
            value={
              <Chip variant="warning" size="sm" tabIndex={-1}>
                {libraryTierLabel}
              </Chip>
            }
          />

          <InfoRow
            label="Джерело"
            value={
              <Chip
                variant={exercise.is_system ? "default" : "success"}
                size="sm"
                tabIndex={-1}
              >
                {exercise.is_system ? "Системна" : "Власна"}
              </Chip>
            }
          />
        </dl>
      </PropertyCard>

      <InfoGroup eyebrow="Системна інформація" title="Історія">
        <dl className="space-y-5">
          <InfoRow
            label="Створено"
            value={formatDate(exercise.created_at)}
            icon="📅"
          />

          <InfoRow
            label="Останнє оновлення"
            value={formatDate(exercise.updated_at)}
            icon="🕒"
          />

          <InfoRow
            label="Походження даних"
            value={
              <Chip
                variant={importSource ? "default" : "success"}
                size="sm"
                tabIndex={-1}
              >
                {dataOriginLabel}
              </Chip>
            }
            icon="↻"
          />

          {importSource ? (
            <InfoRow
              label="Джерело імпорту"
              value={
                <span className="block max-w-full break-words text-right">
                  {importSource}
                </span>
              }
              icon="⇩"
            />
          ) : null}

          <InfoRow
            label="Код вправи"
            value={exercise.code || "Не вказано"}
            icon="#"
          />

          <InfoRow
            label="ID"
            value={
              <span
                className="block max-w-full truncate font-mono text-xs"
                title={exercise.id}
              >
                {exercise.id}
              </span>
            }
            icon="ID"
          />
        </dl>
      </InfoGroup>

      <section className="rounded-3xl border border-dashed border-sky-300 bg-sky-50 p-6">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
          📅
        </div>

        <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-sky-700">
          Конструктор тренувань
        </p>

        <h2 className="mt-2 text-2xl font-black text-slate-950">
          Використати у плані
        </h2>

        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
          Незабаром цю вправу можна буде додавати до конкретного блоку
          тренування безпосередньо з бібліотеки.
        </p>

        <button
          type="button"
          disabled
          className="mt-5 inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center rounded-full bg-slate-200 px-5 text-sm font-black text-slate-500"
        >
          Додати до плану — скоро
        </button>
      </section>
    </aside>
  );
}

function EmptyProperty({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
      <p className="text-sm font-semibold leading-6 text-slate-400">
        {message}
      </p>
    </div>
  );
}
