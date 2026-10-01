const STATUS_LABELS = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  REVIEW: 'Review',
  COMPLETED: 'Completed',
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  ON_HOLD: 'On hold',
  PENDING: 'Pending',
  PENDING_REVIEW: 'Pending review',
  CHANGES_REQUESTED: 'Changes requested',
  APPROVED: 'Approved',
  DRAFT: 'Draft',
  SENT: 'Sent',
  VIEWED: 'Viewed',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
};

const STATUS_TONE = {
  ACTIVE: 'sage',
  COMPLETED: 'sage',
  APPROVED: 'sage',
  PAID: 'sage',
  IN_PROGRESS: 'copper',
  REVIEW: 'copper',
  PENDING_REVIEW: 'copper',
  SENT: 'navy',
  VIEWED: 'navy',
  OVERDUE: 'wine',
  CHANGES_REQUESTED: 'wine',
  CANCELLED: 'muted',
  ON_HOLD: 'muted',
  TODO: 'muted',
  DRAFT: 'muted',
  PLANNING: 'muted',
  PENDING: 'muted',
};

export function statusLabel(value) {
  return STATUS_LABELS[value] || value || '';
}

export function statusTone(value) {
  return STATUS_TONE[value] || 'muted';
}

export function inr(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatDay(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatWhen(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function bytesLabel(bytes) {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

export function activitySentence(entry) {
  const who = entry.actor?.name || 'ClientFlow';
  const meta = entry.metadata || {};
  switch (entry.action) {
    case 'project.created':
      return `${who} created ${meta.name}`;
    case 'project.status_changed':
      return `${who} moved ${meta.name} to ${statusLabel(meta.to)}`;
    case 'client.created':
      return `${who} added ${meta.company}`;
    case 'member.invited':
      return `${who} invited ${meta.email} as ${String(meta.role || '').toLowerCase()}`;
    case 'task.created':
      return `${who} added task “${meta.title}”`;
    case 'task.status_changed':
      return `${who} moved “${meta.title}” to ${statusLabel(meta.to)}`;
    case 'milestone.created':
      return `${who} added milestone ${meta.title}`;
    case 'milestone.status_changed':
      return `${who} moved ${meta.title} to ${statusLabel(meta.to)}`;
    case 'deliverable.uploaded':
      return `${who} uploaded ${meta.title} v${meta.version}`;
    case 'deliverable.approved':
      return `${who} approved ${meta.title} v${meta.version}`;
    case 'deliverable.changes_requested':
      return `${who} requested changes on ${meta.title} v${meta.version}`;
    case 'deliverable.commented':
      return `${who} commented on ${meta.title}`;
    case 'invoice.created':
      return `${who} drafted invoice #${meta.number}`;
    case 'invoice.sent':
      return `${who} sent invoice #${meta.number}`;
    case 'invoice.viewed':
      return `${who} opened invoice #${meta.number}`;
    case 'invoice.paid':
      return `${who} recorded payment for invoice #${meta.number}`;
    case 'invoice.overdue':
      return `Invoice #${meta.number} is overdue`;
    case 'invoice.cancelled':
      return `${who} cancelled invoice #${meta.number}`;
    case 'plan.changed':
      return `${who} changed the plan from ${meta.from} to ${meta.to}`;
    case 'organization.updated':
      return `${who} updated the studio profile`;
    default:
      return `${who} updated ${entry.resource}`;
  }
}

export function errorMessage(error) {
  return error?.response?.data?.error?.message || 'Something went wrong. Try again.';
}
