"use client";

import type { ExerciseWorkspaceSidebarProps } from "../types/types";

export default function ExerciseWorkspaceSidebar({
  children,
}: ExerciseWorkspaceSidebarProps) {
  return <div className="space-y-6">{children}</div>;
}
