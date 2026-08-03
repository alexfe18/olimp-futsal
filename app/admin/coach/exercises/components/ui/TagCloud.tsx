import Chip from "./Chip";

type ChipVariant = "default" | "secondary" | "success" | "warning" | "danger";

type ChipSize = "sm" | "md";

type TagCloudProps = {
  tags: string[];
  variant?: ChipVariant;
  size?: ChipSize;
  emptyMessage?: string;
  className?: string;
};

export default function TagCloud({
  tags,
  variant = "secondary",
  size = "sm",
  emptyMessage = "Теги ще не додано.",
  className = "",
}: TagCloudProps) {
  const normalizedTags = Array.from(
    new Set(tags.map((tag) => tag.trim()).filter(Boolean)),
  );

  if (normalizedTags.length === 0) {
    return (
      <div
        className={[
          "rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center",
          className,
        ].join(" ")}
      >
        <p className="text-sm font-semibold leading-6 text-slate-400">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className={["flex flex-wrap gap-2", className].join(" ")}>
      {normalizedTags.map((tag) => (
        <Chip key={tag} variant={variant} size={size}>
          {tag}
        </Chip>
      ))}
    </div>
  );
}
