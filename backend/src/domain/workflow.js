const INVOICE_TRANSITIONS = {
  DRAFT: ['SENT', 'CANCELLED'],
  SENT: ['VIEWED', 'PAID', 'OVERDUE', 'CANCELLED'],
  VIEWED: ['PAID', 'OVERDUE', 'CANCELLED'],
  OVERDUE: ['PAID', 'CANCELLED'],
  PAID: [],
  CANCELLED: [],
};

export function canTransitionInvoice(from, to) {
  return Boolean(INVOICE_TRANSITIONS[from]?.includes(to));
}

export function canReviewDeliverable(status) {
  return status === 'PENDING_REVIEW';
}

export function canUploadNextVersion(latestStatus) {
  return latestStatus === 'CHANGES_REQUESTED' || latestStatus === 'APPROVED';
}

export function priceInvoice(lines, taxRate) {
  if (!Number.isInteger(taxRate) || taxRate < 0 || taxRate > 100) {
    return { ok: false, reason: 'Tax rate must be a whole number from 0 to 100.' };
  }
  if (!Array.isArray(lines) || lines.length === 0) {
    return { ok: false, reason: 'Add at least one line.' };
  }
  let subtotal = 0;
  for (const line of lines) {
    if (!line.description?.trim()) {
      return { ok: false, reason: 'Every line needs a description.' };
    }
    if (!Number.isInteger(line.amount) || line.amount < 1) {
      return { ok: false, reason: 'Line amounts are whole rupees, at least ₹1.' };
    }
    subtotal += line.amount;
  }
  const tax = Math.round((subtotal * taxRate) / 100);
  return {
    ok: true,
    lines: lines.map((line) => ({ description: line.description.trim(), amount: line.amount })),
    taxRate,
    subtotal,
    tax,
    total: subtotal + tax,
  };
}
