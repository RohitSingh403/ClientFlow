import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, parseBody } from '../http.js';
import { authorize } from '../middleware/authorize.js';
import { Project } from '../models.js';
import { publicClient } from '../presenters.js';
import { findClient } from '../services/access.js';
import { recordActivity } from '../services/audit.js';
import { assertCanCreate } from '../services/usage.js';
import { Client } from '../models.js';

const router = Router();

const clientSchema = z.object({
  name: z.string().trim().min(2, 'Contact name must be at least 2 characters.').max(80),
  company: z.string().trim().min(2, 'Company name must be at least 2 characters.').max(120),
  email: z.string().trim().email('Enter a valid email.').transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(30).optional().default(''),
});

router.get(
  '/',
  authorize('client:view'),
  asyncHandler(async (req, res) => {
    const clients = await Client.find({ organization: req.organization._id }).sort({ company: 1 });
    res.json({ clients: clients.map(publicClient) });
  }),
);

router.post(
  '/',
  authorize('client:create'),
  asyncHandler(async (req, res) => {
    const body = parseBody(clientSchema, req.body);
    await assertCanCreate(req.organization, 'client');
    const client = await Client.create({ ...body, organization: req.organization._id });
    await recordActivity({
      organization: req.organization._id,
      actor: req.user._id,
      action: 'client.created',
      resource: 'client',
      resourceId: client._id,
      metadata: { company: client.company },
    });
    res.status(201).json({ client: publicClient(client) });
  }),
);

router.get(
  '/:id',
  authorize('client:view'),
  asyncHandler(async (req, res) => {
    const client = await findClient(req, req.params.id);
    const projects = await Project.find({ organization: req.organization._id, client: client._id })
      .sort({ updatedAt: -1 })
      .select('name status dueDate');
    res.json({
      client: publicClient(client),
      projects: projects.map((project) => ({
        id: String(project._id),
        name: project.name,
        status: project.status,
        dueDate: project.dueDate,
      })),
    });
  }),
);

router.patch(
  '/:id',
  authorize('client:update'),
  asyncHandler(async (req, res) => {
    const body = parseBody(
      z.object({
        name: z.string().trim().min(2, 'Contact name must be at least 2 characters.').max(80).optional(),
        company: z.string().trim().min(2, 'Company name must be at least 2 characters.').max(120).optional(),
        email: z.string().trim().email('Enter a valid email.').transform((value) => value.toLowerCase()).optional(),
        phone: z.string().trim().max(30).optional(),
      }),
      req.body,
    );
    const client = await findClient(req, req.params.id);
    Object.assign(client, body);
    await client.save();
    res.json({ client: publicClient(client) });
  }),
);

export default router;
