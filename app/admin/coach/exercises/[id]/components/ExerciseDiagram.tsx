import Image from "next/image";

import ContentCard from "../../components/ui/ContentCard";

type ExerciseDiagramProps = {
  title: string;
  diagramUrl: string | null;
};

export default function ExerciseDiagram({
  title,
  diagramUrl,
}: ExerciseDiagramProps) {
  return (
    <ContentCard
      icon="🗺️"
      eyebrow="Візуалізація"
      title="Схема вправи"
      isEmpty={!diagramUrl}
      emptyMessage="Схему для цієї вправи ще не додано."
      contentClassName="whitespace-normal"
    >
      {diagramUrl ? (
        <div className="relative h-[420px] overflow-hidden rounded-3xl bg-slate-100">
          <Image
            src={diagramUrl}
            alt={`Схема: ${title}`}
            fill
            sizes="(max-width: 1280px) 100vw, 70vw"
            className="object-contain"
          />
        </div>
      ) : null}
    </ContentCard>
  );
}
