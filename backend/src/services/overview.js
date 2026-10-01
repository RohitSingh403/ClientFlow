import { Deliverable, Invoice, Project, Task } from '../models.js';
import { can } from '../domain/permissions.js';
import { PLANS } from '../domain/entitlements.js';
import { projectFilter, visibleProjectIds } from './access.js';
import { getUsage, limitsFor } from './usage.js';
import { Activity } from '../models.js';

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function lastMonths(count, now = new Date()) {
  const months = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    months.push({
      key: monthKey(date),
      label: date.toLocaleString('en-IN', { month: 'short' }),
    });
  }
  return months;
}

async function countsBy(model, match, field) {
  const rows = await model.aggregate([
    { $match: match },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  ]);
  return rows.map((row) => ({ status: row._id, count: row.count }));
}

export async function buildOverview(req) {
  const role = req.membership.role;
  const organizationId = req.organization._id;
  const projectIds = await visibleProjectIds(req);
  const plan = PLANS[req.organization.plan];

  const pendingMatch = {
    organization: organizationId,
    project: { $in: projectIds },
    status: 'PENDING_REVIEW',
  };
  const [pendingCount, pendingDeliverables] = await Promise.all([
    Deliverable.countDocuments(pendingMatch),
    Deliverable.find(pendingMatch).sort({ updatedAt: -1 }).limit(8).populate({ path: 'project', select: 'name' }),
  ]);

  const pendingApprovals = pendingDeliverables.map((item) => ({
    deliverableId: String(item._id),
    projectId: String(item.project?._id || item.project),
    projectName: item.project?.name || 'Project',
    title: item.title,
    status: item.status,
  }));

  const myTasks = await Task.find({
    organization: organizationId,
    project: { $in: projectIds },
    assignee: req.user._id,
    status: { $ne: 'COMPLETED' },
  })
    .sort({ dueDate: 1 })
    .limit(8)
    .populate({ path: 'project', select: 'name' });

  const activityQuery = { organization: organizationId };
  if (!['OWNER', 'ADMIN', 'MANAGER'].includes(role)) {
    activityQuery.project = { $in: projectIds };
  }
  const recentActivity = await Activity.find(activityQuery)
    .sort({ createdAt: -1 })
    .limit(8)
    .populate('actor', 'name email');

  const base = {
    role,
    plan: req.organization.plan,
    pendingApprovals,
    myTasks: myTasks.map((task) => ({
      id: String(task._id),
      title: task.title,
      status: task.status,
      dueDate: task.dueDate,
      projectId: String(task.project?._id || task.project),
      projectName: task.project?.name || 'Project',
    })),
    recentActivity,
    cards: null,
    charts: null,
    usage: null,
    limits: null,
    openInvoices: [],
  };

  if (role === 'CLIENT') {
    const openInvoices = await Invoice.find({
      organization: organizationId,
      project: { $in: projectIds },
      status: { $in: ['SENT', 'VIEWED', 'OVERDUE'] },
    })
      .sort({ dueDate: 1 })
      .limit(8);
    base.openInvoices = openInvoices.map((invoice) => ({
      id: String(invoice._id),
      number: invoice.number,
      status: invoice.status,
      total: invoice.total,
      dueDate: invoice.dueDate,
    }));
    return base;
  }

  if (!can(role, 'analytics:view')) return base;

  const now = new Date();
  const [activeProjects, completedProjects, overdueTasks, outstanding, paid] = await Promise.all([
    Project.countDocuments({ ...projectFilter(req), status: 'ACTIVE' }),
    Project.countDocuments({ ...projectFilter(req), status: 'COMPLETED' }),
    Task.countDocuments({
      organization: organizationId,
      project: { $in: projectIds },
      status: { $ne: 'COMPLETED' },
      dueDate: { $ne: null, $lt: now },
    }),
    Invoice.aggregate([
      {
        $match: {
          organization: organizationId,
          status: { $in: ['SENT', 'VIEWED', 'OVERDUE'] },
        },
      },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Invoice.aggregate([
      { $match: { organization: organizationId, status: 'PAID' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
  ]);

  base.cards = {
    activeProjects,
    pendingApprovals: pendingCount,
    outstandingInvoices: outstanding[0]?.total || 0,
    revenue: paid[0]?.total || 0,
    completedProjects,
    overdueTasks,
  };
  base.usage = await getUsage(organizationId);
  base.limits = limitsFor(req.organization.plan);

  if (!plan.analytics) return base;

  const [projectsByStatus, tasksByStatus, invoiceRows, paidInvoices] = await Promise.all([
    countsBy(Project, { organization: organizationId }, 'status'),
    countsBy(Task, { organization: organizationId, project: { $in: projectIds } }, 'status'),
    Invoice.aggregate([
      { $match: { organization: organizationId } },
      { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' } } },
    ]),
    Invoice.find({ organization: organizationId, status: 'PAID', paidAt: { $ne: null } }).select(
      'paidAt total',
    ),
  ]);

  const months = lastMonths(6, now);
  const revenueByMonth = months.map((month) => ({
    ...month,
    total: paidInvoices
      .filter((invoice) => monthKey(new Date(invoice.paidAt)) === month.key)
      .reduce((sum, invoice) => sum + invoice.total, 0),
  }));

  base.charts = {
    revenueByMonth,
    projectsByStatus,
    tasksByStatus,
    invoicesByStatus: invoiceRows.map((row) => ({
      status: row._id,
      count: row.count,
      total: row.total,
    })),
  };
  return base;
}
