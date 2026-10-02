import { db } from "@/lib/db";

export async function recordActivity(input: {
  organizationId: string;
  actorId?: string | null;
  action: string;
  resource: string;
  resourceId: string;
  summary: string;
  metadata?: Record<string, string | number>;
}) {
  await db.activityLog.create({
    data: {
      organizationId: input.organizationId,
      actorId: input.actorId ?? null,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      summary: input.summary,
      metadata: input.metadata,
    },
  });
}

export async function notifyUsers(input: {
  organizationId: string;
  userIds: string[];
  title: string;
  body: string;
}) {
  const userIds = [...new Set(input.userIds)];
  if (userIds.length === 0) return;
  await db.notification.createMany({
    data: userIds.map((userId) => ({
      organizationId: input.organizationId,
      userId,
      title: input.title,
      body: input.body,
    })),
  });
}

export async function enqueueEmail(input: {
  organizationId: string;
  toEmail: string;
  subject: string;
  body: string;
}) {
  await db.outboundMessage.create({ data: { ...input, status: "PENDING" } });
}

export async function projectAudience(projectId: string, organizationId: string, exceptUserId?: string) {
  const project = await db.project.findFirst({
    where: { id: projectId, organizationId },
    include: { members: true },
  });
  if (!project) return [];
  const ids = new Set(project.members.map((member) => member.userId));
  const portal = await db.membership.findFirst({
    where: { organizationId, clientId: project.clientId, role: "CLIENT" },
  });
  if (portal) ids.add(portal.userId);
  if (exceptUserId) ids.delete(exceptUserId);
  return [...ids];
}

export async function financeAudience(organizationId: string, exceptUserId?: string) {
  const members = await db.membership.findMany({
    where: { organizationId, role: { in: ["OWNER", "ADMIN", "MANAGER"] } },
  });
  return members.map((member) => member.userId).filter((id) => id !== exceptUserId);
}
