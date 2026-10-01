"use server";

import { db } from "@/lib/db";
import { readDate, readString } from "@/lib/form";
import { formatINR, invoiceTotals, parseTaxRate, rupeesToPaise } from "@/lib/money";
import { projectWhere } from "@/lib/scope";
import { canTransitionInvoice, isInvoiceStatus } from "@/lib/workflow";
import { enqueueEmail, financeAudience, notifyUsers, recordActivity } from "@/server/activity";
import { authorize, type ActionState } from "@/server/guard";
import { refreshWorkspace } from "@/server/refresh";

export async function createInvoice(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await authorize("invoice:create");
  if (!gate.ok) return { error: gate.error };
  const { ctx } = gate;
  const projectId = readString(formData, "projectId");
  const dueDate = readDate(formData, "dueDate");
  const taxRate = parseTaxRate(readString(formData, "taxRate"));
  if (dueDate === "invalid" || !dueDate) return { error: "Choose a due date." };
  if (taxRate === null) return { error: "Choose a tax rate." };

  const descriptions = formData.getAll("description").map((value) => (typeof value === "string" ? value.trim() : ""));
  const amounts = formData.getAll("amount").map((value) => (typeof value === "string" ? value.trim() : ""));
  if (descriptions.length === 0 || descriptions.length !== amounts.length) return { error: "Add at least one line." };

  const lines: { description: string; amount: number }[] = [];
  for (let i = 0; i < descriptions.length; i += 1) {
    if (!descriptions[i] && !amounts[i]) continue;
    const amount = rupeesToPaise(amounts[i] ?? "");
    if (!descriptions[i] || amount === null || amount <= 0) return { error: "Each line needs a description and an amount." };
    lines.push({ description: descriptions[i], amount });
  }
  if (lines.length === 0) return { error: "Add at least one line." };

  const project = await db.project.findFirst({
    where: { id: projectId, ...projectWhere(ctx) },
    include: { client: true },
  });
  if (!project) return { error: "Choose a project from this workspace." };

  const totals = invoiceTotals(lines.map((line) => line.amount), taxRate);
  const invoice = await db.$transaction(async (tx) => {
    const org = await tx.organization.update({
      where: { id: ctx.organizationId },
      data: { invoiceSeq: { increment: 1 } },
    });
    return tx.invoice.create({
      data: {
        organizationId: ctx.organizationId,
        projectId: project.id,
        clientId: project.clientId,
        number: `INV-${org.invoiceSeq}`,
        status: "DRAFT",
        subtotal: totals.subtotal,
        taxRate,
        tax: totals.tax,
        total: totals.total,
        dueDate,
        lines: {
          create: lines.map((line, index) => ({
            description: line.description,
            amount: line.amount,
            position: index,
          })),
        },
      },
    });
  });

  await recordActivity({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "invoice.created",
    resource: "invoice",
    resourceId: invoice.id,
    summary: `${ctx.user.name} created ${invoice.number}`,
  });
  refreshWorkspace();
  return { message: `${invoice.number} was saved as a draft for ${formatINR(invoice.total)}.` };
}

async function transitionInvoice(formData: FormData, permission: string, to: "SENT" | "PAID" | "CANCELLED"): Promise<ActionState> {
  const gate = await authorize(permission);
  if (!gate.ok) return { error: gate.error };
  const { ctx } = gate;
  const invoiceId = readString(formData, "invoiceId");
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, organizationId: ctx.organizationId },
    include: { client: true, project: true },
  });
  if (!invoice) return { error: "That invoice is not in this workspace." };
  if (!isInvoiceStatus(invoice.status) || !canTransitionInvoice(invoice.status, to)) {
    return { error: `${invoice.number} cannot move from ${invoice.status.toLowerCase()} to ${to.toLowerCase()}.` };
  }

  const now = new Date();
  await db.invoice.update({
    where: { id: invoice.id },
    data: {
      status: to,
      sentAt: to === "SENT" ? now : invoice.sentAt,
      paidAt: to === "PAID" ? now : invoice.paidAt,
    },
  });

  const verb = to === "SENT" ? "sent" : to === "PAID" ? "recorded payment for" : "cancelled";
  await recordActivity({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: to === "SENT" ? "invoice.sent" : to === "PAID" ? "invoice.paid" : "invoice.cancelled",
    resource: "invoice",
    resourceId: invoice.id,
    summary: `${ctx.user.name} ${verb} ${invoice.number}`,
    metadata: { from: invoice.status, to },
  });

  if (to === "SENT") {
    const portal = await db.membership.findFirst({
      where: { organizationId: ctx.organizationId, clientId: invoice.clientId, role: "CLIENT" },
    });
    if (portal) {
      await notifyUsers({
        organizationId: ctx.organizationId,
        userIds: [portal.userId],
        title: `${invoice.number} is ready`,
        body: `${invoice.project.name} · ${formatINR(invoice.total)}`,
      });
    }
    await enqueueEmail({
      organizationId: ctx.organizationId,
      toEmail: invoice.client.email,
      subject: `Invoice ${invoice.number}`,
      body: `${invoice.number} for ${formatINR(invoice.total)} is ready.`,
    });
  }
  if (to === "PAID") {
    const audience = await financeAudience(ctx.organizationId, ctx.userId);
    await notifyUsers({
      organizationId: ctx.organizationId,
      userIds: audience,
      title: `${invoice.number} was paid`,
      body: formatINR(invoice.total),
    });
  }
  refreshWorkspace();
  return { message: `${invoice.number} is now ${to.toLowerCase()}.` };
}

export async function sendInvoice(_prev: ActionState, formData: FormData) {
  return transitionInvoice(formData, "invoice:send", "SENT");
}

export async function collectInvoice(_prev: ActionState, formData: FormData) {
  return transitionInvoice(formData, "invoice:collect", "PAID");
}

export async function cancelInvoice(_prev: ActionState, formData: FormData) {
  return transitionInvoice(formData, "invoice:cancel", "CANCELLED");
}

export async function markInvoiceViewed(invoiceId: string) {
  const gate = await authorize("invoice:view");
  if (!gate.ok) return;
  const { ctx } = gate;
  if (ctx.role !== "CLIENT") return;
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, organizationId: ctx.organizationId, clientId: ctx.clientId ?? "__deny__" },
  });
  if (!invoice || !isInvoiceStatus(invoice.status) || !canTransitionInvoice(invoice.status, "VIEWED")) return;
  await db.invoice.update({
    where: { id: invoice.id },
    data: { status: "VIEWED", viewedAt: new Date() },
  });
  await recordActivity({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "invoice.viewed",
    resource: "invoice",
    resourceId: invoice.id,
    summary: `${ctx.user.name} viewed ${invoice.number}`,
    metadata: { from: invoice.status, to: "VIEWED" },
  });
  const audience = await financeAudience(ctx.organizationId, ctx.userId);
  await notifyUsers({
    organizationId: ctx.organizationId,
    userIds: audience,
    title: `${invoice.number} was viewed`,
    body: `${ctx.user.name} opened the invoice.`,
  });
  refreshWorkspace();
}
