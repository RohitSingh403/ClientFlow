import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { asyncHandler, HttpError, parseBody } from '../http.js';
import { authorize } from '../middleware/authorize.js';
import { Client, Membership, User } from '../models.js';
import { publicUser } from '../presenters.js';
import { recordActivity } from '../services/audit.js';
import { assertCanCreate } from '../services/usage.js';

const router = Router();

const inviteSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80),
  email: z.string().trim().email('Enter a valid email.').transform((value) => value.toLowerCase()),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(100).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE', 'CLIENT']),
  clientId: z.string().optional(),
});

router.get(
  '/',
  authorize('member:view'),
  asyncHandler(async (req, res) => {
    const memberships = await Membership.find({ organization: req.organization._id })
      .populate('user', 'name email')
      .populate('client', 'company name')
      .sort({ createdAt: 1 });
    res.json({
      members: memberships.map((membership) => ({
        id: String(membership._id),
        role: membership.role,
        user: publicUser(membership.user),
        clientId: membership.client ? String(membership.client._id) : null,
        clientCompany: membership.client?.company || null,
      })),
    });
  }),
);

router.post(
  '/',
  authorize('member:invite'),
  asyncHandler(async (req, res) => {
    const body = parseBody(inviteSchema, req.body);
    if (body.role === 'CLIENT' && !body.clientId) {
      throw new HttpError(400, 'A client portal user must be linked to a client.', 'VALIDATION');
    }
    let client = null;
    if (body.role === 'CLIENT') {
      client = await Client.findOne({ _id: body.clientId, organization: req.organization._id });
      if (!client) throw new HttpError(404, 'Client not found.', 'NOT_FOUND');
    }

    let user = await User.findOne({ email: body.email });
    if (user) {
      const existing = await Membership.findOne({ user: user._id, organization: req.organization._id });
      if (existing) throw new HttpError(409, 'That person is already in this studio.', 'ALREADY_MEMBER');
    }
    if (body.role !== 'CLIENT') await assertCanCreate(req.organization, 'member');
    if (!user) {
      if (!body.password) {
        throw new HttpError(400, 'Set a password for a new person.', 'VALIDATION');
      }
      user = await User.create({
        name: body.name,
        email: body.email,
        passwordHash: await bcrypt.hash(body.password, 10),
      });
    }

    const membership = await Membership.create({
      user: user._id,
      organization: req.organization._id,
      role: body.role,
      client: client?._id || null,
    });

    await recordActivity({
      organization: req.organization._id,
      actor: req.user._id,
      action: 'member.invited',
      resource: 'membership',
      resourceId: membership._id,
      metadata: { email: user.email, role: body.role },
    });

    res.status(201).json({
      member: {
        id: String(membership._id),
        role: membership.role,
        user: publicUser(user),
        clientId: client ? String(client._id) : null,
      },
    });
  }),
);

export default router;
