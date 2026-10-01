import { PLANS, withinLimit } from '../domain/entitlements.js';
import { HttpError } from '../http.js';
import { Client, DeliverableVersion, Membership, Project } from '../models.js';

export async function getUsage(organizationId) {
  const [projects, clients, members, storage] = await Promise.all([
    Project.countDocuments({ organization: organizationId }),
    Client.countDocuments({ organization: organizationId }),
    Membership.countDocuments({ organization: organizationId, role: { $ne: 'CLIENT' } }),
    DeliverableVersion.aggregate([
      { $match: { organization: organizationId } },
      { $group: { _id: null, bytes: { $sum: '$size' } } },
    ]),
  ]);
  return {
    projects,
    clients,
    members,
    storageBytes: storage[0]?.bytes || 0,
  };
}

export async function assertCanCreate(organization, resource) {
  const limits = PLANS[organization.plan];
  const usage = await getUsage(organization._id);
  const spec = {
    project: [usage.projects, limits.projects, 'Projects'],
    client: [usage.clients, limits.clients, 'Clients'],
    member: [usage.members, limits.members, 'Team members'],
  }[resource];
  const [used, limit, label] = spec;
  const result = withinLimit(used, limit);
  if (!result.ok) {
    throw new HttpError(
      402,
      `${label} limit reached (${result.used} of ${result.limit}). Upgrade the plan to add more.`,
      'QUOTA_EXCEEDED',
    );
  }
}

export async function assertStorage(organization, extraBytes) {
  const usage = await getUsage(organization._id);
  const limit = PLANS[organization.plan].storageBytes;
  if (usage.storageBytes + extraBytes > limit) {
    throw new HttpError(402, 'Storage limit reached for this plan.', 'QUOTA_EXCEEDED');
  }
}

export function limitsFor(planName) {
  const plan = PLANS[planName];
  return {
    projects: Number.isFinite(plan.projects) ? plan.projects : null,
    clients: Number.isFinite(plan.clients) ? plan.clients : null,
    members: Number.isFinite(plan.members) ? plan.members : null,
    storageBytes: plan.storageBytes,
  };
}
