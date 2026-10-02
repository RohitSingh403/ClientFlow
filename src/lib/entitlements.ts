const MB = 1024 * 1024;
const GB = 1024 * MB;

export const PLANS = {
  FREE: {
    label: "Free",
    price: "Free",
    projects: 2,
    clients: 5,
    members: 2,
    storageBytes: 500 * MB,
    storageLabel: "500 MB",
    analytics: false,
    branding: false,
  },
  PRO: {
    label: "Pro",
    price: "₹499/mo",
    projects: 20,
    clients: 50,
    members: 10,
    storageBytes: 10 * GB,
    storageLabel: "10 GB",
    analytics: true,
    branding: false,
  },
  BUSINESS: {
    label: "Business",
    price: "₹1,499/mo",
    projects: Number.POSITIVE_INFINITY,
    clients: Number.POSITIVE_INFINITY,
    members: 50,
    storageBytes: 100 * GB,
    storageLabel: "100 GB",
    analytics: true,
    branding: true,
  },
} as const;

export type Plan = keyof typeof PLANS;

export function isPlan(value: string): value is Plan {
  return value === "FREE" || value === "PRO" || value === "BUSINESS";
}

export function hasRoom(used: number, limit: number) {
  return !Number.isFinite(limit) || used < limit;
}

export function fitsPlan(used: number, limit: number) {
  return !Number.isFinite(limit) || used <= limit;
}

export function withinStorage(used: number, adding: number, limit: number) {
  return !Number.isFinite(limit) || used + adding <= limit;
}

export function formatQuota(limit: number) {
  return Number.isFinite(limit) ? String(limit) : "Unlimited";
}
