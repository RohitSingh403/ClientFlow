import PDFDocument from 'pdfkit';
import { canTransitionInvoice, priceInvoice } from '../domain/workflow.js';
import { HttpError } from '../http.js';
import { Invoice, Organization } from '../models.js';
import { recordActivity } from './audit.js';
import { notify, userIdsByRole, clientPortalUserIds } from './notify.js';

export async function nextInvoiceNumber(organizationId) {
  const org = await Organization.findOneAndUpdate(
    { _id: organizationId },
    { $inc: { invoiceSeq: 1 } },
    { returnDocument: 'after' },
  );
  return org.invoiceSeq;
}

export function applyPrice(lines, taxRate) {
  const priced = priceInvoice(lines, taxRate);
  if (!priced.ok) throw new HttpError(400, priced.reason, 'VALIDATION');
  return priced;
}

export async function transitionInvoice(invoice, to, extra = {}) {
  if (!canTransitionInvoice(invoice.status, to)) {
    throw new HttpError(
      409,
      `Invoice cannot move from ${invoice.status} to ${to}.`,
      'INVALID_TRANSITION',
    );
  }
  invoice.status = to;
  Object.assign(invoice, extra);
  await invoice.save();
  return invoice;
}

export async function markOverdueInvoices(now = new Date()) {
  const due = await Invoice.find({
    status: { $in: ['SENT', 'VIEWED'] },
    dueDate: { $ne: null, $lt: now },
  });
  let changed = 0;
  for (const invoice of due) {
    if (!canTransitionInvoice(invoice.status, 'OVERDUE')) continue;
    invoice.status = 'OVERDUE';
    await invoice.save();
    changed += 1;
    await recordActivity({
      organization: invoice.organization,
      project: invoice.project,
      actor: null,
      action: 'invoice.overdue',
      resource: 'invoice',
      resourceId: invoice._id,
      metadata: { number: invoice.number },
    });
    const recipients = await userIdsByRole(invoice.organization, ['OWNER', 'ADMIN', 'MANAGER']);
    await notify(recipients, {
      organization: invoice.organization,
      type: 'invoice',
      title: `Invoice #${invoice.number} is overdue`,
      body: 'The due date passed and the invoice is still unpaid.',
      link: `/app/invoices/${invoice._id}`,
    });
  }
  return changed;
}

export async function notifyInvoiceSent(invoice, actorId) {
  const recipients = await clientPortalUserIds(invoice.organization, invoice.client);
  await notify(
    recipients,
    {
      organization: invoice.organization,
      type: 'invoice',
      title: `Invoice #${invoice.number} is ready`,
      body: 'A new invoice is waiting in your portal.',
      link: `/app/invoices/${invoice._id}`,
    },
    actorId,
  );
}

export function renderInvoicePdf({ invoice, organization, client, project }) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.fillColor('#172033').fontSize(22).text(organization.name);
  doc.moveDown(0.2);
  doc.fontSize(12).fillColor('#3e4a5a').text('Invoice');
  doc.moveDown(0.6);
  doc.fillColor('#172033').fontSize(16).text(`#${invoice.number}`);
  doc.moveDown(0.8);
  doc.fontSize(11).fillColor('#172033');
  doc.text(`Client: ${client?.company || 'Client'}`);
  doc.text(`Contact: ${client?.name || ''}`);
  if (project?.name) doc.text(`Project: ${project.name}`);
  doc.text(`Status: ${invoice.status}`);
  if (invoice.dueDate) doc.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`);
  doc.moveDown(1);
  doc.fontSize(11);
  invoice.lines.forEach((line) => {
    doc.text(line.description, { continued: true });
    doc.text(`₹${line.amount.toLocaleString('en-IN')}`, { align: 'right' });
  });
  doc.moveDown(0.6);
  doc.text(`Subtotal`, { continued: true });
  doc.text(`₹${invoice.subtotal.toLocaleString('en-IN')}`, { align: 'right' });
  doc.text(`GST (${invoice.taxRate}%)`, { continued: true });
  doc.text(`₹${invoice.tax.toLocaleString('en-IN')}`, { align: 'right' });
  doc.moveDown(0.3);
  doc.fontSize(13).text(`Total`, { continued: true });
  doc.text(`₹${invoice.total.toLocaleString('en-IN')}`, { align: 'right' });
  doc.end();
  return doc;
}
