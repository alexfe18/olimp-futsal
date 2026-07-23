import type { Metadata } from "next";
import Training from "@/components/Training";

export const metadata: Metadata = {
  title: "Підтвердження участі у тренуванні",
  description: "Підтвердьте участь у найближчому тренуванні СК Олімп Футзал.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function TrainingPage() {
  return <Training variant="standalone" />;
}
