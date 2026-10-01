"use server";

import { db } from "@/lib/db";
import { readString } from "@/lib/form";
import { getContext } from "@/lib/session";
import { authorize, type ActionState } from "@/server/guard";
import { runWorker } from "@/server/jobs";
import { refreshWorkspace } from "@/server/refresh";

export async function markNotificationRead(formData: FormData) {
  const ctx = await getContext();
  if (!ctx) return;
  const id = readString(formData, "notificationId");
  await db.notification.updateMany({
    where: { id, userId: ctx.userId, organizationId: ctx.organizationId },
    data: { read: true },
  });
  refreshWorkspace();
}

export async function markAllNotificationsRead() {
  const ctx = await getContext();
  if (!ctx) return;
  await db.notification.updateMany({
    where: { userId: ctx.userId, organizationId: ctx.organizationId, read: false },
    data: { read: true },
  });
  refreshWorkspace();
}

export async function runJobs(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  const gate = await authorize("jobs:run");
  if (!gate.ok) return { error: gate.error };
  const [result] = await runWorker(gate.ctx.organizationId);
  refreshWorkspace();
  return {
    message: `Worker finished. ${result?.overdue ?? 0} overdue, ${result?.sent ?? 0} messages sent.`,
  };
}
