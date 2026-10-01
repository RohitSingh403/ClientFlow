import { Router } from 'express';
import { asyncHandler } from '../http.js';
import { authorize } from '../middleware/authorize.js';
import { Activity, Notification } from '../models.js';
import { publicActivity, publicNotification } from '../presenters.js';
import { visibleProjectIds } from '../services/access.js';
import { buildOverview } from '../services/overview.js';

const router = Router();

router.get(
  '/activity',
  authorize('activity:view'),
  asyncHandler(async (req, res) => {
    const filter = { organization: req.organization._id };
    if (!['OWNER', 'ADMIN', 'MANAGER'].includes(req.membership.role)) {
      filter.project = { $in: await visibleProjectIds(req) };
    }
    const entries = await Activity.find(filter)
      .sort({ createdAt: -1 })
      .limit(80)
      .populate('actor', 'name email');
    res.json({ activity: entries.map(publicActivity) });
  }),
);

router.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const notes = await Notification.find({
      organization: req.organization._id,
      user: req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(40);
    const unreadCount = await Notification.countDocuments({
      organization: req.organization._id,
      user: req.user._id,
      read: false,
    });
    res.json({ notifications: notes.map(publicNotification), unreadCount });
  }),
);

router.post(
  '/notifications/read-all',
  asyncHandler(async (req, res) => {
    await Notification.updateMany(
      { organization: req.organization._id, user: req.user._id, read: false },
      { read: true },
    );
    res.json({ ok: true });
  }),
);

router.post(
  '/notifications/:id/read',
  asyncHandler(async (req, res) => {
    await Notification.updateOne(
      { _id: req.params.id, organization: req.organization._id, user: req.user._id },
      { read: true },
    );
    res.json({ ok: true });
  }),
);

router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const overview = await buildOverview(req);
    overview.recentActivity = overview.recentActivity.map(publicActivity);
    res.json(overview);
  }),
);

export default router;
