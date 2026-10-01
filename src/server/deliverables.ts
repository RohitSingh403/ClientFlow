"use server";

import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { fileKind, MAX_UPLOAD_BYTES, safeFileName } from "@/lib/files";
import { readString } from "@/lib/form";
import { withinStorage } from "@/lib/entitlements";
import { projectWhere } from "@/lib/scope";
import { canTransitionDeliverable, canUploadNextVersion, isApprovalStatus } from "@/lib/workflow";
import { enqueueEmail, notifyUsers, projectAudience, recordActivity } from "@/server/activity";
import { authorize, usageSnapshot, type ActionState } from "@/server/guard";
import { refreshWorkspace } from "@/server/refresh";
import { saveObject } from "@/server/storage";

async function readUpload(formData: FormData): Promise<{ error: string } | { bytes: Buffer; fileName: string; contentType: string; ext: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Files must be 5 MB or smaller." };
  const kind = fileKind(file.name);
  if (!kind) return { error: "Upload a PNG, JPG, WEBP, SVG, or PDF." };
  const bytes = Buffer.from(await file.arrayBuffer());
  return { bytes, fileName: safeFileName(file.name), contentType: kind.contentType, ext: kind.ext };
}

export async function createDeliverable(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await authorize("deliverable:create");
  if (!gate.ok) return { error: gate.error };
  const { ctx } = gate;
  const projectId = readString(formData, "projectId");
  const title = readString(formData, "title");
  const changeDescription = readString(formData, "changeDescription");
  if (title.length < 2) return { error: "Name the deliverable." };
  const upload = await readUpload(formData);
  if ("error" in upload) return { error: upload.error };

  const project = await db.project.findFirst({
    where: { id: projectId, ...projectWhere(ctx) },
    include: { client: true },
  });
  if (!project) return { error: "That project is not in this workspace." };

  const usage = await usageSnapshot(ctx.organizationId, ctx.organization.plan);
  if (!withinStorage(usage.storageBytes, upload.bytes.length, usage.limits.storageBytes)) {
    return { error: `This file would pass the ${usage.limits.storageLabel} storage limit.` };
  }

  const id = randomUUID();
  const storageKey = `${ctx.organizationId}/${id}${upload.ext}`;
  await saveObject(storageKey, upload.bytes);
  const deliverable = await db.deliverable.create({
    data: {
      organizationId: ctx.organizationId,
      projectId: project.id,
      title,
      versions: {
        create: {
          id,
          organizationId: ctx.organizationId,
          version: 1,
          fileName: upload.fileName,
          storageKey,
          contentType: upload.contentType,
          byteSize: upload.bytes.length,
          changeDescription,
          status: "PENDING",
          uploadedById: ctx.userId,
        },
      },
    },
  });

  await recordActivity({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "deliverable.created",
    resource: "deliverable",
    resourceId: deliverable.id,
    summary: `${ctx.user.name} uploaded ${title} v1`,
  });
  const portal = await db.membership.findFirst({
    where: { organizationId: ctx.organizationId, clientId: project.clientId, role: "CLIENT" },
    include: { user: true },
  });
  if (portal) {
    await notifyUsers({
      organizationId: ctx.organizationId,
      userIds: [portal.userId],
      title: `${title} is ready for review`,
      body: `${ctx.user.name} uploaded v1 on ${project.name}.`,
    });
    await enqueueEmail({
      organizationId: ctx.organizationId,
      toEmail: portal.user.email,
      subject: `${title} is ready for review`,
      body: `${ctx.user.name} uploaded ${title} v1 for ${project.name}.`,
    });
  }
  refreshWorkspace();
  return { message: `${title} v1 is waiting for review.` };
}

export async function uploadVersion(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await authorize("deliverable:create");
  if (!gate.ok) return { error: gate.error };
  const { ctx } = gate;
  const deliverableId = readString(formData, "deliverableId");
  const changeDescription = readString(formData, "changeDescription");
  if (changeDescription.length < 3) return { error: "Describe what changed in this version." };
  const upload = await readUpload(formData);
  if ("error" in upload) return { error: upload.error };

  const deliverable = await db.deliverable.findFirst({
    where: { id: deliverableId, project: projectWhere(ctx) },
    include: {
      versions: { orderBy: { version: "desc" }, take: 1 },
      project: true,
    },
  });
  if (!deliverable) return { error: "That deliverable is not in this workspace." };
  const latest = deliverable.versions[0];
  if (!latest || !isApprovalStatus(latest.status) || !canUploadNextVersion(latest.status)) {
    return { error: "Upload the next version after the client requests changes." };
  }

  const usage = await usageSnapshot(ctx.organizationId, ctx.organization.plan);
  if (!withinStorage(usage.storageBytes, upload.bytes.length, usage.limits.storageBytes)) {
    return { error: `This file would pass the ${usage.limits.storageLabel} storage limit.` };
  }

  const id = randomUUID();
  const storageKey = `${ctx.organizationId}/${id}${upload.ext}`;
  const versionNumber = latest.version + 1;
  await saveObject(storageKey, upload.bytes);
  await db.deliverableVersion.create({
    data: {
      id,
      organizationId: ctx.organizationId,
      deliverableId: deliverable.id,
      version: versionNumber,
      fileName: upload.fileName,
      storageKey,
      contentType: upload.contentType,
      byteSize: upload.bytes.length,
      changeDescription,
      status: "PENDING",
      uploadedById: ctx.userId,
    },
  });
  await recordActivity({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "deliverable.version_added",
    resource: "deliverable",
    resourceId: deliverable.id,
    summary: `${ctx.user.name} uploaded ${deliverable.title} v${versionNumber}`,
    metadata: { version: versionNumber },
  });
  const portal = await db.membership.findFirst({
    where: { organizationId: ctx.organizationId, clientId: deliverable.project.clientId, role: "CLIENT" },
    include: { user: true },
  });
  if (portal) {
    await notifyUsers({
      organizationId: ctx.organizationId,
      userIds: [portal.userId],
      title: `${deliverable.title} v${versionNumber} is ready`,
      body: changeDescription,
    });
    await enqueueEmail({
      organizationId: ctx.organizationId,
      toEmail: portal.user.email,
      subject: `${deliverable.title} v${versionNumber} is ready for review`,
      body: changeDescription,
    });
  }
  refreshWorkspace();
  return { message: `v${versionNumber} is waiting for review.` };
}

export async function reviewDeliverable(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await authorize("deliverable:approve");
  if (!gate.ok) return { error: gate.error };
  const { ctx } = gate;
  const versionId = readString(formData, "versionId");
  const decision = readString(formData, "decision");
  const note = readString(formData, "note");
  if (decision !== "APPROVED" && decision !== "CHANGES_REQUESTED") return { error: "Choose approve or request changes." };
  if (decision === "CHANGES_REQUESTED" && note.length < 3) return { error: "Tell the team what needs to change." };

  const version = await db.deliverableVersion.findFirst({
    where: { id: versionId, deliverable: { project: projectWhere(ctx) } },
    include: { deliverable: { include: { versions: { orderBy: { version: "desc" }, take: 1 }, project: true } } },
  });
  if (!version) return { error: "That version is not in this workspace." };
  if (version.deliverable.versions[0]?.id !== version.id) return { error: "Review the latest version." };
  if (!isApprovalStatus(version.status) || !canTransitionDeliverable(version.status, decision)) {
    return { error: "This version is no longer waiting for review." };
  }

  await db.deliverableVersion.update({ where: { id: version.id }, data: { status: decision } });
  if (note) {
    await db.comment.create({
      data: { organizationId: ctx.organizationId, versionId: version.id, authorId: ctx.userId, body: note },
    });
  }
  const label = decision === "APPROVED" ? "approved" : "requested changes on";
  await recordActivity({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: decision === "APPROVED" ? "deliverable.approved" : "deliverable.changes_requested",
    resource: "deliverable",
    resourceId: version.deliverableId,
    summary: `${ctx.user.name} ${label} ${version.deliverable.title} v${version.version}`,
    metadata: { from: version.status, to: decision, version: version.version },
  });
  const audience = await projectAudience(version.deliverable.projectId, ctx.organizationId, ctx.userId);
  await notifyUsers({
    organizationId: ctx.organizationId,
    userIds: audience,
    title: decision === "APPROVED" ? `${version.deliverable.title} was approved` : `Changes requested on ${version.deliverable.title}`,
    body: note || `${ctx.user.name} reviewed v${version.version}.`,
  });
  refreshWorkspace();
  return { message: decision === "APPROVED" ? "Approved." : "The team has your notes." };
}

export async function addComment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await authorize("deliverable:comment");
  if (!gate.ok) return { error: gate.error };
  const { ctx } = gate;
  const versionId = readString(formData, "versionId");
  const body = readString(formData, "body");
  if (body.length < 1 || body.length > 2000) return { error: "Write a comment." };
  const version = await db.deliverableVersion.findFirst({
    where: { id: versionId, deliverable: { project: projectWhere(ctx) } },
    include: { deliverable: true },
  });
  if (!version) return { error: "That version is not in this workspace." };
  await db.comment.create({
    data: { organizationId: ctx.organizationId, versionId: version.id, authorId: ctx.userId, body },
  });
  await recordActivity({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "deliverable.commented",
    resource: "deliverable",
    resourceId: version.deliverableId,
    summary: `${ctx.user.name} commented on ${version.deliverable.title} v${version.version}`,
  });
  refreshWorkspace();
  return { message: "Comment added." };
}
