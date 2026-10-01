"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { fitsPlan, hasRoom, PLANS, type Plan } from "@/lib/entitlements";
import { readDate, readString } from "@/lib/form";
import { projectWhere } from "@/lib/scope";
import { isProjectStatus, isTaskStatus } from "@/lib/workflow";
import { enqueueEmail, notifyUsers, projectAudience, recordActivity } from "@/server/activity";
import { authorize, usageSnapshot, type ActionState } from "@/server/guard";
import { refreshWorkspace } from "@/server/refresh";

function hexColor(value: string): string | null {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : null;
}

export async function createClient(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await authorize("client:create");
  if (!gate.ok) return { error: gate.error };
  const { ctx } = gate;
  const company = readString(formData, "company");
  const contactName = readString(formData, "contactName");
  const email = readString(formData, "email").toLowerCase();
  const phone = readString(formData, "phone");
  if (company.length < 2) return { error: "Enter the company name." };
  if (contactName.length < 2) return { error: "Enter a contact name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email." };

  const usage = await usageSnapshot(ctx.organizationId, ctx.organization.plan);
  if (!hasRoom(usage.clients, usage.limits.clients)) {
    return { error: `The ${usage.limits.label} plan allows ${usage.limits.clients} clients.` };
  }

  try {
    const client = await db.client.create({
      data: { organizationId: ctx.organizationId, company, contactName, email, phone },
    });
    await recordActivity({
      organizationId: ctx.organizationId,
      actorId: ctx.userId,
      action: "client.created",
      resource: "client",
      resourceId: client.id,
      summary: `${ctx.user.name} created client ${company}`,
    });
  } catch {
    return { error: "A client with that email already exists in this workspace." };
  }
  refreshWorkspace();
  return { message: `${company} was added.` };
}

export async function createProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await authorize("project:create");
  if (!gate.ok) return { error: gate.error };
  const { ctx } = gate;
  const name = readString(formData, "name");
  const description = readString(formData, "description");
  const clientId = readString(formData, "clientId");
  const status = readString(formData, "status") || "PLANNING";
  const startDate = readDate(formData, "startDate");
  const dueDate = readDate(formData, "dueDate");
  if (name.length < 2) return { error: "Name the project." };
  if (!isProjectStatus(status) || status === "COMPLETED") return { error: "Choose a starting status." };
  if (startDate === "invalid" || dueDate === "invalid") return { error: "Check the dates." };

  const client = await db.client.findFirst({ where: { id: clientId, organizationId: ctx.organizationId } });
  if (!client) return { error: "Choose a client from this workspace." };

  const usage = await usageSnapshot(ctx.organizationId, ctx.organization.plan);
  if (!hasRoom(usage.projects, usage.limits.projects)) {
    const limit = Number.isFinite(usage.limits.projects) ? String(usage.limits.projects) : "unlimited";
    return { error: `The ${usage.limits.label} plan allows ${limit} projects. This workspace is at the limit.` };
  }

  const project = await db.project.create({
    data: {
      organizationId: ctx.organizationId,
      clientId: client.id,
      name,
      description,
      status,
      startDate,
      dueDate,
      members: { create: { userId: ctx.userId } },
    },
  });
  await recordActivity({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "project.created",
    resource: "project",
    resourceId: project.id,
    summary: `${ctx.user.name} created project ${name}`,
  });
  refreshWorkspace();
  redirect(`/projects/${project.id}`);
}

export async function updateProjectStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await authorize("project:update");
  if (!gate.ok) return { error: gate.error };
  const { ctx } = gate;
  const projectId = readString(formData, "projectId");
  const status = readString(formData, "status");
  if (!isProjectStatus(status)) return { error: "Choose a project status." };

  const project = await db.project.findFirst({
    where: { id: projectId, ...projectWhere(ctx) },
    include: {
      tasks: true,
      deliverables: { include: { versions: { orderBy: { version: "desc" }, take: 1 } } },
    },
  });
  if (!project) return { error: "That project is not in this workspace." };
  if (project.status === status) return { message: "Status is unchanged." };

  if (status === "COMPLETED") {
    const openTask = project.tasks.find((task) => task.status !== "COMPLETED");
    if (openTask) return { error: `Finish “${openTask.title}” before completing the project.` };
    const waiting = project.deliverables.find((item) => item.versions[0]?.status !== "APPROVED");
    if (waiting) return { error: `“${waiting.title}” still needs client approval.` };
  }

  await db.project.update({ where: { id: project.id }, data: { status } });
  await recordActivity({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "project.updated",
    resource: "project",
    resourceId: project.id,
    summary: `${ctx.user.name} set ${project.name} to ${status.toLowerCase().replaceAll("_", " ")}`,
    metadata: { from: project.status, to: status },
  });
  refreshWorkspace();
  return { message: "Project status saved." };
}

export async function deleteProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await authorize("project:delete");
  if (!gate.ok) return { error: gate.error };
  const { ctx } = gate;
  const projectId = readString(formData, "projectId");
  const project = await db.project.findFirst({
    where: { id: projectId, organizationId: ctx.organizationId },
    include: { _count: { select: { invoices: true } } },
  });
  if (!project) return { error: "That project is not in this workspace." };
  if (project._count.invoices > 0) return { error: "This project has invoices, so it stays in the workspace." };
  await db.project.delete({ where: { id: project.id } });
  await recordActivity({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "project.deleted",
    resource: "project",
    resourceId: project.id,
    summary: `${ctx.user.name} deleted project ${project.name}`,
  });
  refreshWorkspace();
  redirect("/projects");
}

export async function addMilestone(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await authorize("project:update");
  if (!gate.ok) return { error: gate.error };
  const { ctx } = gate;
  const projectId = readString(formData, "projectId");
  const title = readString(formData, "title");
  const dueDate = readDate(formData, "dueDate");
  if (title.length < 2) return { error: "Name the milestone." };
  if (dueDate === "invalid") return { error: "Check the due date." };
  const project = await db.project.findFirst({ where: { id: projectId, ...projectWhere(ctx) } });
  if (!project) return { error: "That project is not in this workspace." };
  const milestone = await db.milestone.create({ data: { projectId: project.id, title, dueDate } });
  await recordActivity({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "milestone.created",
    resource: "project",
    resourceId: project.id,
    summary: `${ctx.user.name} added milestone ${title}`,
    metadata: { milestoneId: milestone.id },
  });
  refreshWorkspace();
  return { message: "Milestone added." };
}

export async function toggleMilestone(formData: FormData) {
  const gate = await authorize("project:update");
  if (!gate.ok) return;
  const { ctx } = gate;
  const milestoneId = readString(formData, "milestoneId");
  const milestone = await db.milestone.findFirst({
    where: { id: milestoneId, project: projectWhere(ctx) },
  });
  if (!milestone) return;
  await db.milestone.update({
    where: { id: milestone.id },
    data: { status: milestone.status === "DONE" ? "OPEN" : "DONE" },
  });
  refreshWorkspace();
}

export async function createTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await authorize("task:create");
  if (!gate.ok) return { error: gate.error };
  const { ctx } = gate;
  const projectId = readString(formData, "projectId");
  const title = readString(formData, "title");
  const assigneeId = readString(formData, "assigneeId");
  const milestoneId = readString(formData, "milestoneId");
  const dueDate = readDate(formData, "dueDate");
  if (title.length < 2) return { error: "Name the task." };
  if (dueDate === "invalid") return { error: "Check the due date." };
  const project = await db.project.findFirst({ where: { id: projectId, ...projectWhere(ctx) } });
  if (!project) return { error: "That project is not in this workspace." };

  let assignee: { id: string; name: string; email: string } | null = null;
  if (assigneeId) {
    const membership = await db.membership.findFirst({
      where: {
        userId: assigneeId,
        organizationId: ctx.organizationId,
        role: { in: ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"] },
      },
      include: { user: true },
    });
    if (!membership) return { error: "Assign someone from this workspace." };
    assignee = membership.user;
  }
  if (milestoneId) {
    const milestone = await db.milestone.findFirst({ where: { id: milestoneId, projectId: project.id } });
    if (!milestone) return { error: "That milestone is not on this project." };
  }

  const task = await db.task.create({
    data: {
      organizationId: ctx.organizationId,
      projectId: project.id,
      title,
      assigneeId: assignee?.id,
      milestoneId: milestoneId || null,
      dueDate,
    },
  });
  await recordActivity({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "task.created",
    resource: "task",
    resourceId: task.id,
    summary: `${ctx.user.name} added task ${title}`,
  });
  if (assignee && assignee.id !== ctx.userId) {
    await notifyUsers({
      organizationId: ctx.organizationId,
      userIds: [assignee.id],
      title: `You were assigned ${title}`,
      body: `${ctx.user.name} assigned you a task on ${project.name}.`,
    });
    await enqueueEmail({
      organizationId: ctx.organizationId,
      toEmail: assignee.email,
      subject: `You were assigned ${title}`,
      body: `${ctx.user.name} assigned you “${title}” on ${project.name}.`,
    });
  }
  refreshWorkspace();
  return { message: "Task added." };
}

export async function updateTaskStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await authorize("task:update");
  if (!gate.ok) return { error: gate.error };
  const { ctx } = gate;
  const taskId = readString(formData, "taskId");
  const status = readString(formData, "status");
  if (!isTaskStatus(status)) return { error: "Choose a task status." };
  const task = await db.task.findFirst({
    where: { id: taskId, project: projectWhere(ctx) },
    include: { project: true },
  });
  if (!task) return { error: "That task is not in this workspace." };
  if (task.status === status) return { message: "Status is unchanged." };
  await db.task.update({ where: { id: task.id }, data: { status } });
  await recordActivity({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "task.status_changed",
    resource: "task",
    resourceId: task.id,
    summary: `${ctx.user.name} moved “${task.title}” to ${status.toLowerCase().replaceAll("_", " ")}`,
    metadata: { from: task.status, to: status },
  });
  const audience = await projectAudience(task.projectId, ctx.organizationId, ctx.userId);
  await notifyUsers({
    organizationId: ctx.organizationId,
    userIds: audience,
    title: `Task updated on ${task.project.name}`,
    body: `${ctx.user.name} moved “${task.title}”.`,
  });
  refreshWorkspace();
  return { message: "Task updated." };
}

export async function addProjectMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await authorize("project:update");
  if (!gate.ok) return { error: gate.error };
  const { ctx } = gate;
  const projectId = readString(formData, "projectId");
  const userId = readString(formData, "userId");
  const project = await db.project.findFirst({ where: { id: projectId, ...projectWhere(ctx) } });
  if (!project) return { error: "That project is not in this workspace." };
  const membership = await db.membership.findFirst({
    where: {
      userId,
      organizationId: ctx.organizationId,
      role: { in: ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"] },
    },
    include: { user: true },
  });
  if (!membership) return { error: "Choose a teammate from this workspace." };
  await db.projectMember.upsert({
    where: { projectId_userId: { projectId: project.id, userId } },
    update: {},
    create: { projectId: project.id, userId },
  });
  await recordActivity({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "project.member_added",
    resource: "project",
    resourceId: project.id,
    summary: `${ctx.user.name} added ${membership.user.name} to ${project.name}`,
  });
  refreshWorkspace();
  return { message: `${membership.user.name} is on the project.` };
}

export async function inviteMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await authorize("member:invite");
  if (!gate.ok) return { error: gate.error };
  const { ctx } = gate;
  const name = readString(formData, "name");
  const email = readString(formData, "email").toLowerCase();
  const password = readString(formData, "password");
  const role = readString(formData, "role");
  if (role !== "ADMIN" && role !== "MANAGER" && role !== "EMPLOYEE") return { error: "Choose a staff role." };
  if (role === "ADMIN" && ctx.role !== "OWNER") return { error: "Only an owner can invite an admin." };
  if (name.length < 2) return { error: "Enter their name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email." };

  const usage = await usageSnapshot(ctx.organizationId, ctx.organization.plan);
  if (!hasRoom(usage.members, usage.limits.members)) {
    return { error: `The ${usage.limits.label} plan allows ${usage.limits.members} team members.` };
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    const already = await db.membership.findUnique({
      where: { userId_organizationId: { userId: existing.id, organizationId: ctx.organizationId } },
    });
    if (already) return { error: "That person is already in this workspace." };
    await db.membership.create({
      data: { userId: existing.id, organizationId: ctx.organizationId, role },
    });
  } else {
    if (password.length < 8) return { error: "Set a password of at least 8 characters for a new account." };
    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.hash(password, 10);
    await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        memberships: { create: { organizationId: ctx.organizationId, role } },
      },
    });
  }

  await recordActivity({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "member.invited",
    resource: "organization",
    resourceId: ctx.organizationId,
    summary: `${ctx.user.name} invited ${name} as ${role.toLowerCase()}`,
  });
  refreshWorkspace();
  return {
    message: existing
      ? `${name} already had an account. They can sign in with their existing password.`
      : `${name} can sign in with the password you set.`,
  };
}

export async function removeMember(formData: FormData) {
  const gate = await authorize("member:remove");
  if (!gate.ok) return;
  const { ctx } = gate;
  const membershipId = readString(formData, "membershipId");
  const membership = await db.membership.findFirst({
    where: { id: membershipId, organizationId: ctx.organizationId },
    include: { user: true },
  });
  if (!membership) return;
  if (membership.role === "OWNER") return;
  if (membership.userId === ctx.userId) return;
  await db.membership.delete({ where: { id: membership.id } });
  await recordActivity({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "member.removed",
    resource: "organization",
    resourceId: ctx.organizationId,
    summary: `${ctx.user.name} removed ${membership.user.name}`,
  });
  refreshWorkspace();
}

export async function grantPortal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await authorize("portal:grant");
  if (!gate.ok) return { error: gate.error };
  const { ctx } = gate;
  const clientId = readString(formData, "clientId");
  const name = readString(formData, "name");
  const email = readString(formData, "email").toLowerCase();
  const password = readString(formData, "password");
  const client = await db.client.findFirst({ where: { id: clientId, organizationId: ctx.organizationId } });
  if (!client) return { error: "Choose a client from this workspace." };
  const existingPortal = await db.membership.findFirst({
    where: { organizationId: ctx.organizationId, clientId: client.id, role: "CLIENT" },
  });
  if (existingPortal) return { error: "This client already has portal access." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email." };

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    const already = await db.membership.findUnique({
      where: { userId_organizationId: { userId: existing.id, organizationId: ctx.organizationId } },
    });
    if (already) return { error: "That email already belongs to someone in this workspace." };
    await db.membership.create({
      data: { userId: existing.id, organizationId: ctx.organizationId, role: "CLIENT", clientId: client.id },
    });
  } else {
    if (password.length < 8 || name.length < 2) return { error: "Enter a name and a password of at least 8 characters." };
    const bcrypt = await import("bcryptjs");
    await db.user.create({
      data: {
        name,
        email,
        passwordHash: await bcrypt.hash(password, 10),
        memberships: {
          create: { organizationId: ctx.organizationId, role: "CLIENT", clientId: client.id },
        },
      },
    });
  }
  await recordActivity({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "portal.granted",
    resource: "client",
    resourceId: client.id,
    summary: `${ctx.user.name} gave ${client.company} portal access`,
  });
  refreshWorkspace();
  return { message: `${client.company} can sign in to review work.` };
}

export async function changePlan(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await authorize("billing:manage");
  if (!gate.ok) return { error: gate.error };
  const { ctx } = gate;
  const plan = readString(formData, "plan");
  if (plan !== "FREE" && plan !== "PRO" && plan !== "BUSINESS") return { error: "Choose a plan." };
  const next = plan as Plan;
  const usage = await usageSnapshot(ctx.organizationId, ctx.organization.plan);
  const limits = PLANS[next];
  if (!fitsPlan(usage.projects, limits.projects) || !fitsPlan(usage.clients, limits.clients) || !fitsPlan(usage.members, limits.members) || !fitsPlan(usage.storageBytes, limits.storageBytes)) {
    return { error: `Current usage does not fit the ${limits.label} plan.` };
  }
  await db.organization.update({ where: { id: ctx.organizationId }, data: { plan: next } });
  await recordActivity({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "plan.changed",
    resource: "organization",
    resourceId: ctx.organizationId,
    summary: `${ctx.user.name} changed the plan to ${limits.label}`,
    metadata: { from: ctx.organization.plan, to: next },
  });
  refreshWorkspace();
  return { message: `This workspace is now on ${limits.label}.` };
}

export async function updateBrand(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await authorize("billing:manage");
  if (!gate.ok) return { error: gate.error };
  const { ctx } = gate;
  if (!PLANS[ctx.organization.plan].branding) {
    return { error: "Custom branding is on the Business plan." };
  }
  const brandColor = hexColor(readString(formData, "brandColor"));
  if (!brandColor) return { error: "Use a hex color such as #1a2e28." };
  await db.organization.update({ where: { id: ctx.organizationId }, data: { brandColor } });
  await recordActivity({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "brand.updated",
    resource: "organization",
    resourceId: ctx.organizationId,
    summary: `${ctx.user.name} updated the brand color`,
  });
  refreshWorkspace();
  return { message: "Brand color saved." };
}
