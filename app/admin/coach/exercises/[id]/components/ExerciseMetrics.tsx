import type { Exercise } from "../types";
import { getPlayersLabel, typeLabels } from "../utils";

type Props = { exercise: Exercise };

export default function ExerciseMetrics({ exercise }: Props) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        label="Тривалість"
        value={`${exercise.duration_minutes} хв`}
      />
      <MetricCard
        label="Гравці"
        value={getPlayersLabel(exercise.min_players, exercise.max_players)}
      />
      <MetricCard
        label="Формат"
        value={exercise.player_format ?? "Не вказано"}
      />
      <MetricCard
        label="Тип"
        value={typeLabels[exercise.exercise_type] ?? exercise.exercise_type}
      />
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-xl font-black text-slate-950">{value}</p>
    </article>
  );
}
