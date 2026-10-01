import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, HttpError, parseBody } from '../http.js';
import { authorize } from '../middleware/authorize.js';
import { Milestone, Project, Task } from '../models.js';
import { publicMilestone, publicTask } from '../presenters.js';
import { assertStaffAssignee, findProject } from '../services/access.js';
import { recordActivity } from '../services/audit.js';
import { notify } from '../services/notify.js';

const router = Router();

router.patch(
  '/milestones/:id',
  authorize('milestone:manage'),
  asyncHandler(async (req, res) => {
    const body = parseBody(
      z.object({
        title: z.string().trim().min(2).max(120).optional(),
        status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional(),
        dueDate: z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), 'Enter a valid date.').nullable().optional(),
      }),
      req.body,
    );
    const milestone = await Milestone.findOne({ _id: req.params.id, organization: req.organization._id });
    if (!milestone) throw new HttpError(404, 'Milestone not found.', 'NOT_FOUND');
    await findProject(req, milestone.project);
    const previous = milestone.status;
    if (body.title) milestone.title = body.title;
    if (body.status) milestone.status = body.status;
    if (body.dueDate !== undefined) milestone.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    await milestone.save();
    if (body.status && body.status !== previous) {
      await recordActivity({
        organization: req.organization._id,
        project: milestone.project,
        actor: req.user._id,
        action: 'milestone.status_changed',
        resource: 'milestone',
        resourceId: milestone._id,
        metadata: { title: milestone.title, from: previous, to: body.status },
      });
    }
    res.json({ milestone: publicMilestone(milestone) });
  }),
);

router.patch(
  '/tasks/:id',
  authorize('task:update'),
  asyncHandler(async (req, res) => {
    const parsed = parseBody(
      z.object({
        title: z.string().trim().min(2).max(160).optional(),
        description: z.string().trim().max(2000).optional(),
        status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED']).optional(),
        assigneeId: z.string().nullable().optional(),
        dueDate: z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), 'Enter a valid date.').nullable().optional(),
      }),
      req.body,
    );
    const body = req.membership.role === 'EMPLOYEE' ? { status: parsed.status } : parsed;
    if (req.membership.role === 'EMPLOYEE' && !body.status) {
      throw new HttpError(400, 'Choose a status.', 'VALIDATION');
    }
    const task = await Task.findOne({ _id: req.params.id, organization: req.organization._id });
    if (!task) throw new HttpError(404, 'Task not found.', 'NOT_FOUND');
    const project = await findProject(req, task.project);
    const previous = task.status;
    if (body.title) task.title = body.title;
    if (body.description !== undefined) task.description = body.description;
    if (body.status) task.status = body.status;
    if (body.dueDate !== undefined) task.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.assigneeId !== undefined) {
      if (body.assigneeId) {
        await assertStaffAssignee(req, body.assigneeId);
        task.assignee = body.assigneeId;
        await Project.updateOne({ _id: project._id }, { $addToSet: { members: body.assigneeId } });
      } else {
        task.assignee = null;
      }
    }
    await task.save();
    if (body.status && body.status !== previous) {
      await recordActivity({
        organization: req.organization._id,
        project: project._id,
        actor: req.user._id,
        action: 'task.status_changed',
        resource: 'task',
        resourceId: task._id,
        metadata: { title: task.title, from: previous, to: body.status },
      });
    }
    if (body.assigneeId && String(body.assigneeId) !== String(req.user._id)) {
      await notify([body.assigneeId], {
        organization: req.organization._id,
        type: 'task',
        title: `You were assigned “${task.title}”`,
        body: project.name,
        link: `/app/projects/${project._id}`,
      });
    }
    await task.populate('assignee', 'name email');
    res.json({ task: publicTask(task) });
  }),
);

export default router;
