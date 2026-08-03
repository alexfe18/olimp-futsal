import Chip from "./ui/Chip";

import { categoryLabels } from "./types";

type CategoryChipsProps = {
  value: string;
  onChange: (category: string) => void;
};

const featuredCategories = [
  "all",
  "warm_up",
  "technical",
  "passing",
  "possession",
  "pressing",
  "defending",
  "attacking",
  "finishing",
  "game",
  "goalkeeper",
];

export default function CategoryChips({ value, onChange }: CategoryChipsProps) {
  return (
    <section
      aria-label="Швидкий вибір категорії"
      className="mt-6 overflow-x-auto lg:overflow-visible"
    >
      <div className="flex min-w-max gap-2 pb-2 lg:min-w-0 lg:flex-wrap">
        {featuredCategories.map((category) => {
          const label =
            category === "all" ? "Усі" : (categoryLabels[category] ?? category);

          return (
            <Chip
              key={category}
              isActive={value === category}
              onClick={() => onChange(category)}
            >
              {label}
            </Chip>
          );
        })}
      </div>
    </section>
  );
}
