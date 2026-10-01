import { Activity } from '../models.js';

export async function recordActivity({
  organization,
  project = null,
  actor,
  action,
  resource,
  resourceId = null,
  metadata = {},
  createdAt,
}) {
  await Activity.create({
    organization,
    project,
    actor,
    action,
    resource,
    resourceId,
    metadata,
    ...(createdAt ? { createdAt } : {}),
  });
}
