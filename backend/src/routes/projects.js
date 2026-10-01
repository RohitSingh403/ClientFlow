import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, HttpError, parseBody } from '../http.js';
import { authorize } from '../middleware/authorize.js';
import { Deliverable, Invoice, Milestone, Task } from '../models.js';
import { Project } from '../models.js';
import { publicClient, publicMilestone, publicTask, publicUser } from '../presenters.js';
import { assertStaffAssignee, findClient, findProject, projectFilter } from '../services/access.js';
import { recordActivity } from '../services/audit.js';
import { notify } from '../services/notify.js';
import { assertCanCreate } from '../services/usage.js';

const router = Router();

const projectSchema = z.object({
  name: z.string().trim().min(2, 'Project name must be at least 2 characters.').max(120),
  description: z.string().trim().max(2000).optional().default(''),
  clientId: z.string().min(1, 'Choose a client.'),
  dueDate: z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), 'Enter a valid date.').optional().nullable(),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED']).optional(),
});

router.get(
  '/',
  authorize('project:view'),
  asyncHandler(async (req, res) => {
    const projects = await Project.find(projectFilter(req))
      .populate('client', 'name company')
      .sort({ updatedAt: -1 });
    const ids = projects.map((project) => project._id);
    const [taskCounts, pendingCounts] = await Promise.all([
      Task.aggregate([
        { $match: { project: { $in: ids } } },
        { $group: { _id: '$project', count: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } } } },
      ]),
      Deliverable.aggregate([
        { $match: { project: { $in: ids }, status: 'PENDING_REVIEW' } },
        { $group: { _id: '$project', count: { $sum: 1 } } },
      ]),
    ]);
    const tasksByProject = new Map(taskCounts.map((row) => [String(row._id), row]));
    const pendingByProject = new Map(pendingCounts.map((row) => [String(row._id), row.count]));
    res.json({
      projects: projects.map((project) => {
        const counts = tasksByProject.get(String(project._id));
        return {
          id: String(project._id),
          name: project.name,
          description: project.description,
          status: project.status,
          dueDate: project.dueDate,
          client: project.client ? publicClient(project.client) : null,
          taskCount: counts?.count || 0,
          tasksDone: counts?.done || 0,
          pendingApprovals: pendingByProject.get(String(project._id)) || 0,
        };
      }),
    });
  }),
);

router.post(
  '/',
  authorize('project:create'),
  asyncHandler(async (req, res) => {
    const body = parseBody(projectSchema, req.body);
    await assertCanCreate(req.organization, 'project');
    const client = await findClient(req, body.clientId);
    const project = await Project.create({
      organization: req.organization._id,
      client: client._id,
      name: body.name,
      description: body.description,
      status: body.status || 'PLANNING',
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      members: [req.user._id],
      createdBy: req.user._id,
    });
    await recordActivity({
      organization: req.organization._id,
      project: project._id,
      actor: req.user._id,
      action: 'project.created',
      resource: 'project',
      resourceId: project._id,
      metadata: { name: project.name },
    });
    res.status(201).json({ project: { id: String(project._id), name: project.name, status: project.status } });
  }),
);

router.get(
  '/:id',
  authorize('project:view'),
  asyncHandler(async (req, res) => {
    const project = await findProject(req, req.params.id);
    await project.populate('client', 'name company email phone');
    await project.populate('members', 'name email');
    const [milestones, tasks, deliverables, invoices] = await Promise.all([
      Milestone.find({ project: project._id }).sort({ createdAt: 1 }),
      Task.find({ project: project._id }).populate('assignee', 'name email').sort({ createdAt: 1 }),
      Deliverable.find({ project: project._id }).sort({ createdAt: 1 }),
      Invoice.find({ project: project._id }).sort({ number: -1 }),
    ]);
    res.json({
      project: {
        id: String(project._id),
        name: project.name,
        description: project.description,
        status: project.status,
        dueDate: project.dueDate,
        client: publicClient(project.client),
        members: project.members.map(publicUser),
      },
      milestones: milestones.map(publicMilestone),
      tasks: tasks.map(publicTask),
      deliverables: deliverables.map((item) => ({
        id: String(item._id),
        title: item.title,
        status: item.status,
      })),
      invoices: invoices.map((invoice) => ({
        id: String(invoice._id),
        number: invoice.number,
        status: invoice.status,
        total: invoice.total,
        dueDate: invoice.dueDate,
      })),
    });
  }),
);

router.patch(
  '/:id',
  authorize('project:update'),
  asyncHandler(async (req, res) => {
    const body = parseBody(
      z.object({
        name: z.string().trim().min(2).max(120).optional(),
        description: z.string().trim().max(2000).optional(),
        status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED']).optional(),
        dueDate: z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), 'Enter a valid date.').nullable().optional(),
      }),
      req.body,
    );
    const project = await findProject(req, req.params.id);
    const previous = project.status;
    if (body.name) project.name = body.name;
    if (body.description !== undefined) project.description = body.description;
    if (body.status) project.status = body.status;
    if (body.dueDate !== undefined) project.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    await project.save();
    if (body.status && body.status !== previous) {
      await recordActivity({
        organization: req.organization._id,
        project: project._id,
        actor: req.user._id,
        action: 'project.status_changed',
        resource: 'project',
        resourceId: project._id,
        metadata: { name: project.name, from: previous, to: body.status },
      });
    }
    res.json({ project: { id: String(project._id), status: project.status, name: project.name } });
  }),
);

const milestoneSchema = z.object({
  title: z.string().trim().min(2, 'Milestone title must be at least 2 characters.').max(120),
  dueDate: z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), 'Enter a valid date.').optional().nullable(),
});

router.post(
  '/:id/milestones',
  authorize('milestone:manage'),
  asyncHandler(async (req, res) => {
    const project = await findProject(req, req.params.id);
    const body = parseBody(milestoneSchema, req.body);
    const milestone = await Milestone.create({
      organization: req.organization._id,
      project: project._id,
      title: body.title,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    });
    await recordActivity({
      organization: req.organization._id,
      project: project._id,
      actor: req.user._id,
      action: 'milestone.created',
      resource: 'milestone',
      resourceId: milestone._id,
      metadata: { title: milestone.title },
    });
    res.status(201).json({ milestone: publicMilestone(milestone) });
  }),
);

const taskSchema = z.object({
  title: z.string().trim().min(2, 'Task title must be at least 2 characters.').max(160),
  description: z.string().trim().max(2000).optional().default(''),
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED']).optional(),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), 'Enter a valid date.').optional().nullable(),
  milestoneId: z.string().optional().nullable(),
});

router.post(
  '/:id/tasks',
  authorize('task:create'),
  asyncHandler(async (req, res) => {
    const project = await findProject(req, req.params.id);
    const body = parseBody(taskSchema, req.body);
    let milestoneId = null;
    if (body.milestoneId) {
      const milestone = await Milestone.findOne({
        _id: body.milestoneId,
        project: project._id,
        organization: req.organization._id,
      });
      if (!milestone) throw new HttpError(404, 'Milestone not found.', 'NOT_FOUND');
      milestoneId = milestone._id;
    }
    if (body.assigneeId) {
      await assertStaffAssignee(req, body.assigneeId);
      await Project.updateOne({ _id: project._id }, { $addToSet: { members: body.assigneeId } });
    }
    const task = await Task.create({
      organization: req.organization._id,
      project: project._id,
      milestone: milestoneId,
      title: body.title,
      description: body.description,
      status: body.status || 'TODO',
      assignee: body.assigneeId || null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      createdBy: req.user._id,
    });
    await recordActivity({
      organization: req.organization._id,
      project: project._id,
      actor: req.user._id,
      action: 'task.created',
      resource: 'task',
      resourceId: task._id,
      metadata: { title: task.title },
    });
    if (body.assigneeId && String(body.assigneeId) !== String(req.user._id)) {
      await notify([body.assigneeId], {
        organization: req.organization._id,
        type: 'task',
        title: `You were assigned “${task.title}”`,
        body: project.name,
        link: `/app/projects/${project._id}`,
      });
    }
    const populated = await task.populate('assignee', 'name email');
    res.status(201).json({ task: publicTask(populated) });
  }),
);

export default router;
