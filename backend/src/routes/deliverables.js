import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, HttpError, parseBody } from '../http.js';
import { authorize } from '../middleware/authorize.js';
import { uploadFile, removeUploaded } from '../lib/upload.js';
import { Comment, Deliverable, DeliverableVersion } from '../models.js';
import { publicComment, publicDeliverable, publicVersion } from '../presenters.js';
import { findProject } from '../services/access.js';
import { recordActivity } from '../services/audit.js';
import { clientPortalUserIds, notify, userIdsByRole } from '../services/notify.js';
import { assertStorage } from '../services/usage.js';
import { canReviewDeliverable, canUploadNextVersion } from '../domain/workflow.js';

const router = Router();

async function loadDeliverable(req, id) {
  const deliverable = await Deliverable.findOne({ _id: id, organization: req.organization._id });
  if (!deliverable) throw new HttpError(404, 'Deliverable not found.', 'NOT_FOUND');
  await findProject(req, deliverable.project);
  return deliverable;
}

async function presentDeliverable(deliverable) {
  const versions = await DeliverableVersion.find({ deliverable: deliverable._id })
    .sort({ version: 1 })
    .populate('uploadedBy', 'name email');
  const comments = await Comment.find({ deliverable: deliverable._id })
    .sort({ createdAt: 1 })
    .populate('author', 'name email');
  const byVersion = new Map();
  for (const comment of comments) {
    const key = String(comment.version);
    const list = byVersion.get(key) || [];
    list.push(comment);
    byVersion.set(key, list);
  }
  return publicDeliverable(
    deliverable,
    versions.map((version) => publicVersion(version, byVersion.get(String(version._id)) || [])),
  );
}

router.get(
  '/deliverables/:id',
  authorize('deliverable:view'),
  asyncHandler(async (req, res) => {
    const deliverable = await loadDeliverable(req, req.params.id);
    res.json({ deliverable: await presentDeliverable(deliverable) });
  }),
);

router.post(
  '/projects/:projectId/deliverables',
  authorize('deliverable:create'),
  uploadFile,
  asyncHandler(async (req, res) => {
    try {
      if (!req.file) throw new HttpError(400, 'Choose a file to upload.', 'VALIDATION');
      const body = parseBody(
        z.object({
          title: z.string().trim().min(2, 'Title must be at least 2 characters.').max(140),
          changeDescription: z.string().trim().max(2000).optional().default(''),
        }),
        req.body,
      );
      const project = await findProject(req, req.params.projectId);
      await assertStorage(req.organization, req.file.size);
      const deliverable = await Deliverable.create({
        organization: req.organization._id,
        project: project._id,
        title: body.title,
      });
      await DeliverableVersion.create({
        organization: req.organization._id,
        deliverable: deliverable._id,
        project: project._id,
        version: 1,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        storedName: req.file.filename,
        changeDescription: body.changeDescription,
        uploadedBy: req.user._id,
      });
      await recordActivity({
        organization: req.organization._id,
        project: project._id,
        actor: req.user._id,
        action: 'deliverable.uploaded',
        resource: 'deliverable',
        resourceId: deliverable._id,
        metadata: { title: deliverable.title, version: 1 },
      });
      const recipients = await clientPortalUserIds(req.organization._id, project.client);
      await notify(
        recipients,
        {
          organization: req.organization._id,
          type: 'deliverable',
          title: `${deliverable.title} is ready for review`,
          body: 'Version 1 is waiting for a decision.',
          link: `/app/projects/${project._id}`,
        },
        req.user._id,
      );
      res.status(201).json({ deliverable: await presentDeliverable(deliverable) });
    } catch (error) {
      removeUploaded(req.file);
      throw error;
    }
  }),
);

router.post(
  '/deliverables/:id/versions',
  authorize('deliverable:create'),
  uploadFile,
  asyncHandler(async (req, res) => {
    try {
      if (!req.file) throw new HttpError(400, 'Choose a file to upload.', 'VALIDATION');
      const body = parseBody(
        z.object({
          changeDescription: z.string().trim().min(3, 'Describe what changed.').max(2000),
        }),
        req.body,
      );
      const deliverable = await loadDeliverable(req, req.params.id);
      const latest = await DeliverableVersion.findOne({ deliverable: deliverable._id }).sort({ version: -1 });
      if (!latest || !canUploadNextVersion(latest.status)) {
        throw new HttpError(
          409,
          'Finish the review on the current version before uploading another.',
          'INVALID_TRANSITION',
        );
      }
      await assertStorage(req.organization, req.file.size);
      const version = await DeliverableVersion.create({
        organization: req.organization._id,
        deliverable: deliverable._id,
        project: deliverable.project,
        version: latest.version + 1,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        storedName: req.file.filename,
        changeDescription: body.changeDescription,
        uploadedBy: req.user._id,
      });
      deliverable.status = 'PENDING_REVIEW';
      await deliverable.save();
      await recordActivity({
        organization: req.organization._id,
        project: deliverable.project,
        actor: req.user._id,
        action: 'deliverable.uploaded',
        resource: 'deliverable',
        resourceId: deliverable._id,
        metadata: { title: deliverable.title, version: version.version },
      });
      const project = await findProject(req, deliverable.project);
      const recipients = await clientPortalUserIds(req.organization._id, project.client);
      await notify(
        recipients,
        {
          organization: req.organization._id,
          type: 'deliverable',
          title: `${deliverable.title} v${version.version} is ready`,
          body: body.changeDescription,
          link: `/app/projects/${project._id}`,
        },
        req.user._id,
      );
      res.status(201).json({ deliverable: await presentDeliverable(deliverable) });
    } catch (error) {
      removeUploaded(req.file);
      throw error;
    }
  }),
);

router.post(
  '/deliverables/:id/decision',
  authorize('deliverable:approve'),
  asyncHandler(async (req, res) => {
    const body = parseBody(
      z.object({
        action: z.enum(['approve', 'request_changes']),
        comment: z.string().trim().max(2000).optional().default(''),
      }),
      req.body,
    );
    if (body.action === 'request_changes' && body.comment.length < 3) {
      throw new HttpError(400, 'Tell the studio what should change.', 'VALIDATION');
    }
    const deliverable = await loadDeliverable(req, req.params.id);
    const latest = await DeliverableVersion.findOne({ deliverable: deliverable._id }).sort({ version: -1 });
    if (!latest || !canReviewDeliverable(latest.status)) {
      throw new HttpError(409, 'This version is not waiting for review.', 'INVALID_TRANSITION');
    }
    const nextStatus = body.action === 'approve' ? 'APPROVED' : 'CHANGES_REQUESTED';
    latest.status = nextStatus;
    latest.decidedBy = req.user._id;
    latest.decidedAt = new Date();
    await latest.save();
    deliverable.status = nextStatus;
    await deliverable.save();
    if (body.comment) {
      await Comment.create({
        organization: req.organization._id,
        project: deliverable.project,
        deliverable: deliverable._id,
        version: latest._id,
        author: req.user._id,
        body: body.comment,
      });
    }
    const action = nextStatus === 'APPROVED' ? 'deliverable.approved' : 'deliverable.changes_requested';
    await recordActivity({
      organization: req.organization._id,
      project: deliverable.project,
      actor: req.user._id,
      action,
      resource: 'deliverable',
      resourceId: deliverable._id,
      metadata: { title: deliverable.title, version: latest.version },
    });
    const managers = await userIdsByRole(req.organization._id, ['OWNER', 'ADMIN', 'MANAGER']);
    const title =
      nextStatus === 'APPROVED'
        ? `${deliverable.title} v${latest.version} was approved`
        : `Changes requested on ${deliverable.title} v${latest.version}`;
    await notify(
      [...managers, latest.uploadedBy],
      {
        organization: req.organization._id,
        type: 'approval',
        title,
        body: body.comment || 'Open the project to see the decision.',
        link: `/app/projects/${deliverable.project}`,
      },
      req.user._id,
    );
    res.json({ deliverable: await presentDeliverable(deliverable) });
  }),
);

router.post(
  '/deliverables/:id/comments',
  authorize('deliverable:comment'),
  asyncHandler(async (req, res) => {
    const body = parseBody(
      z.object({
        body: z.string().trim().min(1, 'Write a comment.').max(2000),
        versionId: z.string().optional(),
      }),
      req.body,
    );
    const deliverable = await loadDeliverable(req, req.params.id);
    const version = body.versionId
      ? await DeliverableVersion.findOne({ _id: body.versionId, deliverable: deliverable._id })
      : await DeliverableVersion.findOne({ deliverable: deliverable._id }).sort({ version: -1 });
    if (!version) throw new HttpError(404, 'Version not found.', 'NOT_FOUND');
    const comment = await Comment.create({
      organization: req.organization._id,
      project: deliverable.project,
      deliverable: deliverable._id,
      version: version._id,
      author: req.user._id,
      body: body.body,
    });
    await comment.populate('author', 'name email');
    await recordActivity({
      organization: req.organization._id,
      project: deliverable.project,
      actor: req.user._id,
      action: 'deliverable.commented',
      resource: 'deliverable',
      resourceId: deliverable._id,
      metadata: { title: deliverable.title, version: version.version },
    });
    res.status(201).json({ comment: publicComment(comment) });
  }),
);

export default router;
