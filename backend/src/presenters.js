import { PLANS } from './domain/entitlements.js';
import { permissionsFor } from './domain/permissions.js';

export function publicUser(user) {
  if (!user) return null;
  return { id: String(user._id), name: user.name, email: user.email };
}

export function publicOrg(org) {
  const plan = PLANS[org.plan];
  return {
    id: String(org._id),
    name: org.name,
    slug: org.slug,
    plan: org.plan,
    planLabel: plan.label,
    defaultTaxRate: org.defaultTaxRate,
    features: {
      invoices: plan.invoices,
      analytics: plan.analytics,
      branding: plan.branding,
    },
    branding: {
      accent: org.branding?.accent || '',
      logoUrl: org.branding?.logoUrl || '',
    },
  };
}

export function publicMembership(membership, org) {
  return {
    id: String(membership._id),
    role: membership.role,
    permissions: permissionsFor(membership.role),
    clientId: membership.client ? String(membership.client._id || membership.client) : null,
    organization: publicOrg(org),
  };
}

export function publicClient(client) {
  return {
    id: String(client._id),
    name: client.name,
    company: client.company,
    email: client.email,
    phone: client.phone || '',
    createdAt: client.createdAt,
  };
}

export function publicVersion(version, comments = []) {
  const uploader = version.uploadedBy;
  return {
    id: String(version._id),
    version: version.version,
    fileName: version.fileName,
    mimeType: version.mimeType,
    size: version.size,
    url: `/uploads/${version.storedName}`,
    changeDescription: version.changeDescription || '',
    status: version.status,
    uploadedAt: version.uploadedAt,
    uploadedBy: uploader?.name ? publicUser(uploader) : { id: String(uploader) },
    decidedAt: version.decidedAt,
    comments: comments.map(publicComment),
  };
}

export function publicComment(comment) {
  const author = comment.author;
  return {
    id: String(comment._id),
    body: comment.body,
    createdAt: comment.createdAt,
    author: author?.name ? publicUser(author) : { id: String(author) },
  };
}

export function publicDeliverable(deliverable, versions) {
  return {
    id: String(deliverable._id),
    title: deliverable.title,
    status: deliverable.status,
    projectId: String(deliverable.project),
    versions,
  };
}

export function publicTask(task) {
  const assignee = task.assignee;
  return {
    id: String(task._id),
    title: task.title,
    description: task.description || '',
    status: task.status,
    dueDate: task.dueDate,
    milestoneId: task.milestone ? String(task.milestone) : null,
    projectId: String(task.project),
    assignee: assignee?.name ? publicUser(assignee) : assignee ? { id: String(assignee) } : null,
  };
}

export function publicMilestone(milestone) {
  return {
    id: String(milestone._id),
    title: milestone.title,
    status: milestone.status,
    dueDate: milestone.dueDate,
    projectId: String(milestone.project),
  };
}

export function publicInvoice(invoice) {
  return {
    id: String(invoice._id),
    number: invoice.number,
    status: invoice.status,
    lines: invoice.lines.map((line) => ({ description: line.description, amount: line.amount })),
    taxRate: invoice.taxRate,
    subtotal: invoice.subtotal,
    tax: invoice.tax,
    total: invoice.total,
    dueDate: invoice.dueDate,
    sentAt: invoice.sentAt,
    viewedAt: invoice.viewedAt,
    paidAt: invoice.paidAt,
    cancelledAt: invoice.cancelledAt,
    paymentMethod: invoice.paymentMethod || '',
    paymentReference: invoice.paymentReference || '',
    projectId: String(invoice.project?._id || invoice.project),
    clientId: String(invoice.client?._id || invoice.client),
    projectName: invoice.project?.name || undefined,
    clientCompany: invoice.client?.company || undefined,
    createdAt: invoice.createdAt,
  };
}

export function publicActivity(entry) {
  const actor = entry.actor;
  return {
    id: String(entry._id),
    action: entry.action,
    resource: entry.resource,
    resourceId: entry.resourceId ? String(entry.resourceId) : null,
    projectId: entry.project ? String(entry.project) : null,
    metadata: entry.metadata || {},
    createdAt: entry.createdAt,
    actor: actor?.name ? publicUser(actor) : null,
  };
}

export function publicNotification(note) {
  return {
    id: String(note._id),
    type: note.type,
    title: note.title,
    body: note.body,
    link: note.link || '',
    read: note.read,
    createdAt: note.createdAt,
  };
}
