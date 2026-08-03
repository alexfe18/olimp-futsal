import ExerciseContentSection from "./ExerciseContentSection";

type Props = { eyebrow: string; title: string; value: string | null };

export default function ExerciseTextSection({ eyebrow, title, value }: Props) {
  return (
    <ExerciseContentSection eyebrow={eyebrow} title={title}>
      <p className="whitespace-pre-wrap leading-8 text-slate-600">
        {value || "Інформацію поки не додано."}
      </p>
    </ExerciseContentSection>
  );
}
