import { db } from "@/lib/db";
import { financeAudience, notifyUsers, recordActivity } from "@/server/activity";

export async function runWorker(organizationId?: string) {
  const organizations = await db.organization.findMany({
    where: organizationId ? { id: organizationId } : undefined,
  });
  const results = [];

  for (const organization of organizations) {
    const due = await db.invoice.findMany({
      where: {
        organizationId: organization.id,
        status: { in: ["SENT", "VIEWED"] },
        dueDate: { lt: new Date() },
      },
    });

    for (const invoice of due) {
      await db.invoice.update({ where: { id: invoice.id }, data: { status: "OVERDUE" } });
      await recordActivity({
        organizationId: organization.id,
        action: "invoice.overdue",
        resource: "invoice",
        resourceId: invoice.id,
        summary: `ClientFlow marked ${invoice.number} overdue`,
        metadata: { from: invoice.status, to: "OVERDUE" },
      });
      await notifyUsers({
        organizationId: organization.id,
        userIds: await financeAudience(organization.id),
        title: `${invoice.number} is overdue`,
        body: "The due date passed while the invoice was still sent or viewed.",
      });
    }

    const pending = await db.outboundMessage.count({
      where: { organizationId: organization.id, status: "PENDING" },
    });
    if (pending > 0) {
      await db.outboundMessage.updateMany({
        where: { organizationId: organization.id, status: "PENDING" },
        data: { status: "SENT" },
      });
    }

    await db.jobRun.create({
      data: {
        organizationId: organization.id,
        result: `${due.length} overdue, ${pending} messages sent`,
      },
    });
    results.push({ organizationId: organization.id, overdue: due.length, sent: pending });
  }

  return results;
}
