export const PLANS = {
  FREE: {
    label: 'Free',
    priceInr: 0,
    projects: 2,
    clients: 5,
    members: 2,
    storageBytes: 500 * 1024 * 1024,
    invoices: true,
    analytics: false,
    branding: false,
  },
  PRO: {
    label: 'Pro',
    priceInr: 499,
    projects: 20,
    clients: 50,
    members: 10,
    storageBytes: 10 * 1024 * 1024 * 1024,
    invoices: true,
    analytics: true,
    branding: false,
  },
  BUSINESS: {
    label: 'Business',
    priceInr: 1499,
    projects: Infinity,
    clients: Infinity,
    members: 50,
    storageBytes: 100 * 1024 * 1024 * 1024,
    invoices: true,
    analytics: true,
    branding: true,
  },
};

export const PLAN_NAMES = Object.keys(PLANS);

export function withinLimit(used, limit) {
  if (Number.isFinite(limit) && used >= limit) {
    return { ok: false, used, limit };
  }
  return { ok: true, used, limit };
}

export function serializePlan(name) {
  const plan = PLANS[name];
  const finite = (value) => (Number.isFinite(value) ? value : null);
  return {
    id: name,
    label: plan.label,
    priceInr: plan.priceInr,
    projects: finite(plan.projects),
    clients: finite(plan.clients),
    members: finite(plan.members),
    storageBytes: plan.storageBytes,
    invoices: plan.invoices,
    analytics: plan.analytics,
    branding: plan.branding,
  };
}
