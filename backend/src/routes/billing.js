import { Router } from 'express';
import { z } from 'zod';
import { PLAN_NAMES, PLANS, serializePlan, withinLimit } from '../domain/entitlements.js';
import { asyncHandler, HttpError, parseBody } from '../http.js';
import { authorize } from '../middleware/authorize.js';
import { recordActivity } from '../services/audit.js';
import { getUsage, limitsFor } from '../services/usage.js';

const router = Router();

router.get(
  '/',
  authorize('billing:view'),
  asyncHandler(async (req, res) => {
    const usage = await getUsage(req.organization._id);
    res.json({
      plan: req.organization.plan,
      usage,
      limits: limitsFor(req.organization.plan),
      plans: PLAN_NAMES.map(serializePlan),
      sandbox: true,
    });
  }),
);

router.post(
  '/plan',
  authorize('billing:manage'),
  asyncHandler(async (req, res) => {
    const body = parseBody(z.object({ plan: z.enum(['FREE', 'PRO', 'BUSINESS']) }), req.body);
    const next = PLANS[body.plan];
    const usage = await getUsage(req.organization._id);
    const checks = [
      ['projects', usage.projects, next.projects, 'projects'],
      ['clients', usage.clients, next.clients, 'clients'],
      ['members', usage.members, next.members, 'team members'],
    ];
    for (const [, used, limit, label] of checks) {
      const result = withinLimit(used, limit);
      if (!result.ok) {
        throw new HttpError(
          409,
          `This studio already has ${used} ${label}, which is over the ${next.label} limit of ${limit}.`,
          'DOWNGRADE_BLOCKED',
        );
      }
    }
    if (usage.storageBytes > next.storageBytes) {
      throw new HttpError(
        409,
        `Stored files are over the ${next.label} storage limit.`,
        'DOWNGRADE_BLOCKED',
      );
    }
    const previous = req.organization.plan;
    req.organization.plan = body.plan;
    await req.organization.save();
    await recordActivity({
      organization: req.organization._id,
      actor: req.user._id,
      action: 'plan.changed',
      resource: 'organization',
      resourceId: req.organization._id,
      metadata: { from: previous, to: body.plan },
    });
    res.json({ plan: req.organization.plan, limits: limitsFor(body.plan), usage });
  }),
);

export default router;
