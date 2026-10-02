import type { ApprovalStatus, InvoiceStatus, ProjectStatus, TaskStatus } from "@/lib/workflow";

export const PROJECT_LABEL: Record<ProjectStatus, string> = {
  PLANNING: "Planning",
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
};

export const TASK_LABEL: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  REVIEW: "Review",
  COMPLETED: "Completed",
};

export const APPROVAL_LABEL: Record<ApprovalStatus, string> = {
  PENDING: "Pending review",
  APPROVED: "Approved",
  CHANGES_REQUESTED: "Changes requested",
};

export const INVOICE_LABEL: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  VIEWED: "Viewed",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

const LABELS: Record<string, string> = {
  ...PROJECT_LABEL,
  ...TASK_LABEL,
  ...APPROVAL_LABEL,
  ...INVOICE_LABEL,
  OPEN: "Open",
  DONE: "Done",
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
  CLIENT: "Client",
};

export function labelFor(status: string) {
  return LABELS[status] ?? status;
}

export function toneFor(status: string) {
  if (["APPROVED", "PAID", "COMPLETED", "DONE", "ACTIVE"].includes(status)) return "good";
  if (["CHANGES_REQUESTED", "OVERDUE", "CANCELLED"].includes(status)) return "bad";
  if (["PENDING", "IN_PROGRESS", "REVIEW", "SENT", "VIEWED", "ON_HOLD"].includes(status)) return "warn";
  if (["OWNER", "ADMIN", "MANAGER", "EMPLOYEE", "CLIENT", "DRAFT"].includes(status)) return "info";
  return "neutral";
}

export function formatDate(value: Date | null | undefined) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(value);
}

export function formatWhen(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(value);
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
