import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, HttpError, parseBody } from '../http.js';
import { authorize } from '../middleware/authorize.js';
import { Client, Invoice, Project } from '../models.js';
import { publicInvoice } from '../presenters.js';
import { findProject, projectFilter } from '../services/access.js';
import { recordActivity } from '../services/audit.js';
import {
  applyPrice,
  nextInvoiceNumber,
  notifyInvoiceSent,
  renderInvoicePdf,
  transitionInvoice,
} from '../services/invoices.js';

const router = Router();

const lineSchema = z.object({
  description: z.string().trim().min(1, 'Every line needs a description.').max(200),
  amount: z.number().int().positive('Line amounts are whole rupees, at least ₹1.'),
});

const invoiceBody = z.object({
  projectId: z.string().min(1, 'Choose a project.'),
  lines: z.array(lineSchema).min(1, 'Add at least one line.'),
  taxRate: z.number().int().min(0).max(100).optional(),
  dueDate: z
    .string()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Enter a valid date.')
    .optional()
    .nullable(),
});

async function loadInvoice(req, id) {
  const invoice = await Invoice.findOne({ _id: id, organization: req.organization._id });
  if (!invoice) throw new HttpError(404, 'Invoice not found.', 'NOT_FOUND');
  if (req.membership.role === 'CLIENT' && invoice.status === 'DRAFT') {
    throw new HttpError(404, 'Invoice not found.', 'NOT_FOUND');
  }
  await findProject(req, invoice.project);
  return invoice;
}

router.get(
  '/',
  authorize('invoice:view'),
  asyncHandler(async (req, res) => {
    const projectIds = (await Project.find(projectFilter(req)).select('_id')).map((project) => project._id);
    const filter = { organization: req.organization._id, project: { $in: projectIds } };
    if (req.query.status && req.membership.role !== 'CLIENT') filter.status = String(req.query.status);
    if (req.membership.role === 'CLIENT') {
      filter.status = req.query.status && req.query.status !== 'DRAFT' ? String(req.query.status) : { $ne: 'DRAFT' };
    }
    const invoices = await Invoice.find(filter)
      .populate('client', 'company name')
      .populate('project', 'name')
      .sort({ number: -1 });
    res.json({ invoices: invoices.map(publicInvoice) });
  }),
);

router.post(
  '/',
  authorize('invoice:create'),
  asyncHandler(async (req, res) => {
    const body = parseBody(invoiceBody, req.body);
    const project = await findProject(req, body.projectId);
    const priced = applyPrice(body.lines, body.taxRate ?? req.organization.defaultTaxRate);
    const number = await nextInvoiceNumber(req.organization._id);
    const invoice = await Invoice.create({
      organization: req.organization._id,
      project: project._id,
      client: project.client,
      number,
      lines: priced.lines,
      taxRate: priced.taxRate,
      subtotal: priced.subtotal,
      tax: priced.tax,
      total: priced.total,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      createdBy: req.user._id,
    });
    await recordActivity({
      organization: req.organization._id,
      project: project._id,
      actor: req.user._id,
      action: 'invoice.created',
      resource: 'invoice',
      resourceId: invoice._id,
      metadata: { number },
    });
    res.status(201).json({ invoice: publicInvoice(invoice) });
  }),
);

router.get(
  '/:id',
  authorize('invoice:view'),
  asyncHandler(async (req, res) => {
    const invoice = await loadInvoice(req, req.params.id);
    await invoice.populate('client', 'company name email');
    await invoice.populate('project', 'name');
    res.json({ invoice: publicInvoice(invoice) });
  }),
);

router.patch(
  '/:id',
  authorize('invoice:update'),
  asyncHandler(async (req, res) => {
    const body = parseBody(invoiceBody.omit({ projectId: true }).partial(), req.body);
    const invoice = await loadInvoice(req, req.params.id);
    if (invoice.status !== 'DRAFT') {
      throw new HttpError(409, 'Only a draft invoice can be edited.', 'INVALID_TRANSITION');
    }
    if (body.lines) {
      const priced = applyPrice(body.lines, body.taxRate ?? invoice.taxRate);
      invoice.lines = priced.lines;
      invoice.taxRate = priced.taxRate;
      invoice.subtotal = priced.subtotal;
      invoice.tax = priced.tax;
      invoice.total = priced.total;
    } else if (body.taxRate !== undefined) {
      const priced = applyPrice(invoice.lines, body.taxRate);
      invoice.taxRate = priced.taxRate;
      invoice.tax = priced.tax;
      invoice.total = priced.total;
    }
    if (body.dueDate !== undefined) invoice.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    await invoice.save();
    res.json({ invoice: publicInvoice(invoice) });
  }),
);

router.post(
  '/:id/send',
  authorize('invoice:send'),
  asyncHandler(async (req, res) => {
    const invoice = await loadInvoice(req, req.params.id);
    if (!invoice.dueDate) throw new HttpError(400, 'Set a due date before sending.', 'VALIDATION');
    await transitionInvoice(invoice, 'SENT', { sentAt: new Date() });
    await recordActivity({
      organization: req.organization._id,
      project: invoice.project,
      actor: req.user._id,
      action: 'invoice.sent',
      resource: 'invoice',
      resourceId: invoice._id,
      metadata: { number: invoice.number },
    });
    await notifyInvoiceSent(invoice, req.user._id);
    res.json({ invoice: publicInvoice(invoice) });
  }),
);

router.post(
  '/:id/view',
  authorize('invoice:view'),
  asyncHandler(async (req, res) => {
    const invoice = await loadInvoice(req, req.params.id);
    if (invoice.status === 'SENT') {
      await transitionInvoice(invoice, 'VIEWED', { viewedAt: new Date() });
      await recordActivity({
        organization: req.organization._id,
        project: invoice.project,
        actor: req.user._id,
        action: 'invoice.viewed',
        resource: 'invoice',
        resourceId: invoice._id,
        metadata: { number: invoice.number },
      });
    }
    res.json({ invoice: publicInvoice(invoice) });
  }),
);

router.post(
  '/:id/pay',
  authorize('invoice:pay'),
  asyncHandler(async (req, res) => {
    const body = parseBody(
      z.object({
        method: z.string().trim().min(2, 'Add a payment method.').max(40),
        reference: z.string().trim().max(80).optional().default(''),
      }),
      req.body,
    );
    const invoice = await loadInvoice(req, req.params.id);
    await transitionInvoice(invoice, 'PAID', {
      paidAt: new Date(),
      paymentMethod: body.method,
      paymentReference: body.reference,
    });
    await recordActivity({
      organization: req.organization._id,
      project: invoice.project,
      actor: req.user._id,
      action: 'invoice.paid',
      resource: 'invoice',
      resourceId: invoice._id,
      metadata: { number: invoice.number, total: invoice.total },
    });
    res.json({ invoice: publicInvoice(invoice) });
  }),
);

router.post(
  '/:id/cancel',
  authorize('invoice:cancel'),
  asyncHandler(async (req, res) => {
    const invoice = await loadInvoice(req, req.params.id);
    await transitionInvoice(invoice, 'CANCELLED', { cancelledAt: new Date() });
    await recordActivity({
      organization: req.organization._id,
      project: invoice.project,
      actor: req.user._id,
      action: 'invoice.cancelled',
      resource: 'invoice',
      resourceId: invoice._id,
      metadata: { number: invoice.number },
    });
    res.json({ invoice: publicInvoice(invoice) });
  }),
);

router.get(
  '/:id/pdf',
  authorize('invoice:view'),
  asyncHandler(async (req, res) => {
    const invoice = await loadInvoice(req, req.params.id);
    const [client, project] = await Promise.all([
      Client.findById(invoice.client),
      Project.findById(invoice.project),
    ]);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${invoice.number}.pdf"`);
    const doc = renderInvoicePdf({
      invoice,
      organization: req.organization,
      client,
      project,
    });
    doc.pipe(res);
  }),
);

export default router;
