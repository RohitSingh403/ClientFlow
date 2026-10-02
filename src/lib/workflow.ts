export const PROJECT_STATUSES = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED"] as const;
export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "COMPLETED"] as const;
export const APPROVAL_STATUSES = ["PENDING", "APPROVED", "CHANGES_REQUESTED"] as const;
export const INVOICE_STATUSES = ["DRAFT", "SENT", "VIEWED", "PAID", "OVERDUE", "CANCELLED"] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

const INVOICE_NEXT: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["VIEWED", "PAID", "OVERDUE", "CANCELLED"],
  VIEWED: ["PAID", "OVERDUE", "CANCELLED"],
  OVERDUE: ["PAID", "CANCELLED"],
  PAID: [],
  CANCELLED: [],
};

export function isProjectStatus(value: string): value is ProjectStatus {
  return PROJECT_STATUSES.includes(value as ProjectStatus);
}

export function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus);
}

export function isApprovalStatus(value: string): value is ApprovalStatus {
  return APPROVAL_STATUSES.includes(value as ApprovalStatus);
}

export function isInvoiceStatus(value: string): value is InvoiceStatus {
  return INVOICE_STATUSES.includes(value as InvoiceStatus);
}

export function canTransitionDeliverable(from: ApprovalStatus, to: ApprovalStatus) {
  return from === "PENDING" && (to === "APPROVED" || to === "CHANGES_REQUESTED");
}

export function canUploadNextVersion(status: ApprovalStatus) {
  return status === "CHANGES_REQUESTED";
}

export function canTransitionInvoice(from: InvoiceStatus, to: InvoiceStatus) {
  return INVOICE_NEXT[from].includes(to);
}
