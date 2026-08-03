import type { ReactNode } from "react";

export type ExerciseWorkspaceHeroProps = {
  badge?: ReactNode;
  title: string;
  description: string;
  actions?: ReactNode;
};

export type ExerciseWorkspaceLayoutProps = {
  content: ReactNode;
  sidebar: ReactNode;
};

export type ExerciseWorkspaceShellProps = {
  hero: ReactNode;
  children: ReactNode;
};

export type ExerciseWorkspaceSidebarProps = {
  children: ReactNode;
};
