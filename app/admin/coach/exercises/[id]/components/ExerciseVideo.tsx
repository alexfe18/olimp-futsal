import ContentCard from "../../components/ui/ContentCard";

type ExerciseVideoProps = {
  videoUrl: string | null;
  externalVideoUrl: string | null;
};

export default function ExerciseVideo({
  videoUrl,
  externalVideoUrl,
}: ExerciseVideoProps) {
  const isEmpty = !videoUrl && !externalVideoUrl;

  return (
    <ContentCard
      icon="🎥"
      eyebrow="Медіа"
      title="Відео вправи"
      isEmpty={isEmpty}
      emptyMessage="Відео для цієї вправи ще не додано."
      contentClassName="whitespace-normal"
    >
      <div className="space-y-4">
        {videoUrl ? (
          <video
            src={videoUrl}
            controls
            preload="metadata"
            className="w-full rounded-3xl bg-black"
          />
        ) : null}

        {externalVideoUrl ? (
          <a
            href={externalVideoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 font-black text-white transition hover:bg-sky-500 hover:text-slate-950"
          >
            Відкрити зовнішнє відео
          </a>
        ) : null}
      </div>
    </ContentCard>
  );
}
