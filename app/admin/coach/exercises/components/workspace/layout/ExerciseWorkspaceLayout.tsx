"use client";

import type { ExerciseWorkspaceLayoutProps } from "../types/types";

export default function ExerciseWorkspaceLayout({
  content,
  sidebar,
}: ExerciseWorkspaceLayoutProps) {
  return (
    <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="space-y-12">{content}</section>

      <aside className="space-y-6 xl:sticky xl:top-6">{sidebar}</aside>
    </div>
  );
}
