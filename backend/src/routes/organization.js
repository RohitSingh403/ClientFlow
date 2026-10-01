import { Router } from 'express';
import { z } from 'zod';
import { PLANS } from '../domain/entitlements.js';
import { asyncHandler, HttpError, parseBody } from '../http.js';
import { authorize } from '../middleware/authorize.js';
import { publicOrg } from '../presenters.js';
import { recordActivity } from '../services/audit.js';

const router = Router();

const updateSchema = z.object({
  name: z.string().trim().min(2, 'Studio name must be at least 2 characters.').max(80).optional(),
  defaultTaxRate: z.number().int().min(0).max(100).optional(),
  branding: z
    .object({
      accent: z.string().regex(/^$|^#[0-9a-fA-F]{6}$/, 'Accent must be a hex color like #d4652f.').optional(),
      logoUrl: z.string().trim().max(300).optional(),
    })
    .optional(),
});

router.get(
  '/organization',
  asyncHandler(async (req, res) => {
    res.json({ organization: publicOrg(req.organization) });
  }),
);

router.patch(
  '/organization',
  authorize('organization:update'),
  asyncHandler(async (req, res) => {
    const body = parseBody(updateSchema, req.body);
    if (body.branding) {
      const plan = PLANS[req.organization.plan];
      if (!plan.branding) {
        throw new HttpError(
          402,
          `The ${plan.label} plan does not include custom branding.`,
          'FEATURE_UNAVAILABLE',
        );
      }
      if (body.branding.accent !== undefined) req.organization.branding.accent = body.branding.accent;
      if (body.branding.logoUrl !== undefined) req.organization.branding.logoUrl = body.branding.logoUrl;
    }
    if (body.name) req.organization.name = body.name;
    if (body.defaultTaxRate !== undefined) req.organization.defaultTaxRate = body.defaultTaxRate;
    req.organization.markModified('branding');
    await req.organization.save();
    await recordActivity({
      organization: req.organization._id,
      actor: req.user._id,
      action: 'organization.updated',
      resource: 'organization',
      resourceId: req.organization._id,
      metadata: { name: req.organization.name },
    });
    res.json({ organization: publicOrg(req.organization) });
  }),
);

export default router;
