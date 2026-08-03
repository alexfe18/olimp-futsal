"use client";

import type { ExerciseWorkspaceShellProps } from "../types/types";

export default function ExerciseWorkspaceShell({
  hero,
  children,
}: ExerciseWorkspaceShellProps) {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {hero}

        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
