import mongoose from 'mongoose';
import { HttpError } from '../http.js';
import { Membership, Organization } from '../models.js';

export async function requireOrg(req, res, next) {
  try {
    const orgId = req.header('x-organization-id');
    if (!orgId || !mongoose.isValidObjectId(orgId)) {
      throw new HttpError(400, 'Choose an organization.', 'ORG_REQUIRED');
    }
    const membership = await Membership.findOne({ user: req.user._id, organization: orgId });
    if (!membership) {
      throw new HttpError(403, 'You do not belong to this organization.', 'TENANT_FORBIDDEN');
    }
    const organization = await Organization.findById(orgId);
    if (!organization) {
      throw new HttpError(403, 'You do not belong to this organization.', 'TENANT_FORBIDDEN');
    }
    req.membership = membership;
    req.organization = organization;
    next();
  } catch (error) {
    next(error);
  }
}
