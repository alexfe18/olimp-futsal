export type AttendanceStatus = "yes" | "maybe" | "no";

export type TrainingStatus = "scheduled" | "cancelled" | "completed";

export type TrainingVariant = "section" | "standalone";

export type TrainingProps = {
  variant?: TrainingVariant;
};

export type TrainingRecord = {
  id: string;
  title: string;
  startsAt: string;
  location: string;
  teamName: string | null;
  status: TrainingStatus;
  cancellationReason: string | null;
};

export type AttendanceRecord = {
  id: string;
  trainingId: string;
  playerId: string | null;
  name: string;
  status: AttendanceStatus;
  updatedAt: string;
};

export type PlayerRecord = {
  id: string;
  fullName: string;
  displayName: string | null;
  shirtNumber: number | null;
  position: string | null;
  isActive: boolean;
};

export type FeedbackState = {
  type: "success" | "error" | "";
  title: string;
  description: string;
};

export type StatusOption = {
  value: AttendanceStatus;
  label: string;
  groupLabel: string;
  icon: string;
};
