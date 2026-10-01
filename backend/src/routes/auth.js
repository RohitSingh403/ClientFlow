import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler, HttpError, parseBody } from '../http.js';
import { Membership, Organization, User } from '../models.js';
import { publicMembership, publicOrg, publicUser } from '../presenters.js';
import { signToken } from '../lib/tokens.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many attempts. Try again in a few minutes.', code: 'RATE_LIMIT' } },
});

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80),
  email: z.string().trim().email('Enter a valid email.').transform((value) => value.toLowerCase()),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(100),
  organizationName: z.string().trim().min(2, 'Studio name must be at least 2 characters.').max(80),
});

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email.').transform((value) => value.toLowerCase()),
  password: z.string().min(1, 'Password is required.'),
});

async function uniqueSlug(name) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'studio';
  let slug = base;
  let suffix = 2;
  while (await Organization.exists({ slug })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

async function membershipsFor(userId) {
  const memberships = await Membership.find({ user: userId }).populate('organization');
  return memberships
    .filter((membership) => membership.organization)
    .map((membership) => publicMembership(membership, membership.organization));
}

router.post(
  '/register',
  authLimit,
  asyncHandler(async (req, res) => {
    const body = parseBody(registerSchema, req.body);
    const existing = await User.findOne({ email: body.email });
    if (existing) throw new HttpError(409, 'An account with that email already exists.', 'EMAIL_TAKEN');

    const user = await User.create({
      name: body.name,
      email: body.email,
      passwordHash: await bcrypt.hash(body.password, 10),
    });
    const organization = await Organization.create({
      name: body.organizationName,
      slug: await uniqueSlug(body.organizationName),
    });
    const membership = await Membership.create({
      user: user._id,
      organization: organization._id,
      role: 'OWNER',
    });

    res.status(201).json({
      token: signToken(user._id),
      user: publicUser(user),
      organization: publicOrg(organization),
      membership: publicMembership(membership, organization),
    });
  }),
);

router.post(
  '/login',
  authLimit,
  asyncHandler(async (req, res) => {
    const body = parseBody(loginSchema, req.body);
    const user = await User.findOne({ email: body.email });
    const matches = user ? await bcrypt.compare(body.password, user.passwordHash) : false;
    if (!user || !matches) {
      throw new HttpError(401, 'Email or password is wrong.', 'INVALID_CREDENTIALS');
    }
    const memberships = await membershipsFor(user._id);
    if (!memberships.length) {
      throw new HttpError(403, 'This account is not part of a studio.', 'NO_ORGANIZATION');
    }
    res.json({
      token: signToken(user._id),
      user: publicUser(user),
      memberships,
    });
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({
      user: publicUser(req.user),
      memberships: await membershipsFor(req.user._id),
    });
  }),
);

export default router;
