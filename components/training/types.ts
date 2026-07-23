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
  status: TrainingStatus;
  cancellationReason: string | null;
};

export type AttendanceRecord = {
  id: string;
  trainingId: string;
  name: string;
  status: AttendanceStatus;
  updatedAt: string;
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
