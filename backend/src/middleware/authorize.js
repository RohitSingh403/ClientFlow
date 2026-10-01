import { can } from '../domain/permissions.js';
import { PLANS } from '../domain/entitlements.js';
import { HttpError } from '../http.js';

export function authorize(...needed) {
  return (req, res, next) => {
    const allowed = needed.every((permission) => can(req.membership.role, permission));
    if (!allowed) {
      next(new HttpError(403, 'You do not have permission to do that.', 'FORBIDDEN'));
      return;
    }
    next();
  };
}

export function requireFeature(feature) {
  return (req, res, next) => {
    const plan = PLANS[req.organization.plan];
    if (!plan[feature]) {
      next(
        new HttpError(
          402,
          `The ${plan.label} plan does not include this. Upgrade to use it.`,
          'FEATURE_UNAVAILABLE',
        ),
      );
      return;
    }
    next();
  };
}
