import mongoose from 'mongoose';
import { HttpError } from '../http.js';
import { Client, Membership, Project } from '../models.js';

export function projectFilter(req) {
  const organization = req.organization._id;
  if (req.membership.role === 'CLIENT') {
    return { organization, client: req.membership.client };
  }
  if (req.membership.role === 'EMPLOYEE') {
    return { organization, members: req.user._id };
  }
  return { organization };
}

export async function visibleProjectIds(req) {
  const projects = await Project.find(projectFilter(req)).select('_id');
  return projects.map((project) => project._id);
}

export async function findProject(req, projectId) {
  if (!mongoose.isValidObjectId(projectId)) {
    throw new HttpError(404, 'Project not found.', 'NOT_FOUND');
  }
  const project = await Project.findOne({ _id: projectId, ...projectFilter(req) });
  if (!project) throw new HttpError(404, 'Project not found.', 'NOT_FOUND');
  return project;
}

export async function findClient(req, clientId) {
  if (!mongoose.isValidObjectId(clientId)) {
    throw new HttpError(404, 'Client not found.', 'NOT_FOUND');
  }
  const client = await Client.findOne({ _id: clientId, organization: req.organization._id });
  if (!client) throw new HttpError(404, 'Client not found.', 'NOT_FOUND');
  return client;
}

export async function assertStaffAssignee(req, userId) {
  if (!mongoose.isValidObjectId(userId)) {
    throw new HttpError(400, 'Assignee must be someone on this studio.', 'VALIDATION');
  }
  const membership = await Membership.findOne({
    user: userId,
    organization: req.organization._id,
    role: { $ne: 'CLIENT' },
  });
  if (!membership) {
    throw new HttpError(400, 'Assignee must be someone on this studio.', 'VALIDATION');
  }
  return membership;
}
