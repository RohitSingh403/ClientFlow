import { Membership, Notification } from '../models.js';

export async function notify(userIds, payload, exceptUserId = null) {
  const skip = exceptUserId ? String(exceptUserId) : null;
  const unique = [...new Set(userIds.filter(Boolean).map(String))].filter((id) => id !== skip);
  if (!unique.length) return;
  await Notification.insertMany(
    unique.map((user) => ({
      user,
      ...payload,
    })),
  );
}

export async function userIdsByRole(organizationId, roles) {
  const rows = await Membership.find({
    organization: organizationId,
    role: { $in: roles },
  }).select('user');
  return rows.map((row) => row.user);
}

export async function clientPortalUserIds(organizationId, clientId) {
  const rows = await Membership.find({
    organization: organizationId,
    role: 'CLIENT',
    client: clientId,
  }).select('user');
  return rows.map((row) => row.user);
}
