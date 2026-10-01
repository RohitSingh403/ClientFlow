import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { priceInvoice } from '../domain/workflow.js';
import { uploadsDir, ensureUploadsDir } from '../lib/upload.js';
import {
  Activity,
  Client,
  Comment,
  Deliverable,
  DeliverableVersion,
  Invoice,
  Membership,
  Milestone,
  Notification,
  Organization,
  Project,
  Task,
  User,
} from '../models.js';
import { markOverdueInvoices } from '../services/invoices.js';

const PASSWORD = 'demo1234';

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(10, 30, 0, 0);
  return date;
}

function onMonthOffset(offset, day) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + offset, day, 11, 0, 0, 0);
}

function writeFile(storedName, contents) {
  ensureUploadsDir();
  const body = Buffer.from(contents);
  fs.writeFileSync(path.join(uploadsDir(), storedName), body);
  return body.length;
}

const homepageV1 = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760">
  <rect width="1200" height="760" fill="#1c2430"/>
  <rect x="48" y="36" width="180" height="28" rx="6" fill="#d4652f"/>
  <text x="68" y="56" fill="#fff8f2" font-family="Georgia" font-size="16">ABC Pvt Ltd</text>
  <text x="48" y="280" fill="#f4efe6" font-family="Georgia" font-size="64">Build what</text>
  <text x="48" y="360" fill="#f4efe6" font-family="Georgia" font-size="64">clients remember</text>
  <text x="48" y="430" fill="#b7c0cc" font-family="Georgia" font-size="22">Homepage draft — the headline clips on a phone.</text>
  <rect x="48" y="480" width="220" height="52" rx="26" fill="#d4652f"/>
  <text x="92" y="512" fill="#fff8f2" font-family="Georgia" font-size="18">Start a project</text>
</svg>`;

const homepageV2 = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760">
  <rect width="1200" height="760" fill="#f6f1ea"/>
  <rect width="1200" height="76" fill="#172033"/>
  <text x="48" y="48" fill="#f6f1ea" font-family="Georgia" font-size="22">ABC Pvt Ltd</text>
  <text x="48" y="300" fill="#172033" font-family="Georgia" font-size="62">A calmer homepage</text>
  <text x="48" y="372" fill="#172033" font-family="Georgia" font-size="62">for the whole team</text>
  <text x="48" y="440" fill="#5c6b7a" font-family="Georgia" font-size="22">Lightened the hero and kept the headline on one screen.</text>
  <rect x="48" y="490" width="200" height="52" rx="26" fill="#d4652f"/>
  <text x="96" y="522" fill="#fff8f2" font-family="Georgia" font-size="18">Book a call</text>
  <rect x="760" y="180" width="360" height="420" rx="24" fill="#efe6da"/>
  <rect x="792" y="220" width="296" height="160" rx="16" fill="#172033"/>
  <rect x="792" y="410" width="200" height="16" rx="8" fill="#c8bbaa"/>
  <rect x="792" y="442" width="260" height="16" rx="8" fill="#ddd2c4"/>
</svg>`;

const logoSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <rect width="800" height="800" fill="#f6f1ea"/>
  <circle cx="400" cy="400" r="220" fill="#172033"/>
  <text x="400" y="430" text-anchor="middle" fill="#f3eee6" font-family="Georgia" font-size="120">ABC</text>
</svg>`;

async function userWith(name, email, passwordHash) {
  return User.create({ name, email, passwordHash });
}

export async function seed() {
  const existing = await User.countDocuments();
  if (existing > 0) {
    console.log('Database already has users. Skipping seed.');
    return;
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const rohit = await userWith('Rohit Singh', 'owner@northline.studio', passwordHash);
  const rahul = await userWith('Rahul Mehta', 'rahul@northline.studio', passwordHash);
  const ananya = await userWith('Ananya Iyer', 'ananya@northline.studio', passwordHash);
  const priya = await userWith('Priya Shah', 'priya@abcpvt.com', passwordHash);
  const meera = await userWith('Meera Nair', 'meera@harbor.co', passwordHash);

  const northline = await Organization.create({
    name: 'Northline Studio',
    slug: 'northline-studio',
    plan: 'PRO',
    defaultTaxRate: 18,
    invoiceSeq: 1025,
  });
  const harbor = await Organization.create({
    name: 'Harbor & Co',
    slug: 'harbor-co',
    plan: 'FREE',
    invoiceSeq: 1023,
  });

  const abc = await Client.create({
    organization: northline._id,
    name: 'Priya Shah',
    company: 'ABC Pvt Ltd',
    email: 'priya@abcpvt.com',
    phone: '+91 98450 11024',
  });
  const brightleaf = await Client.create({
    organization: northline._id,
    name: 'Dev Kapoor',
    company: 'Brightleaf Foods',
    email: 'dev@brightleaf.example',
    phone: '+91 99800 22018',
  });
  const harborClient = await Client.create({
    organization: harbor._id,
    name: 'Leela Joseph',
    company: 'Coastline Hotels',
    email: 'leela@coastline.example',
  });

  await Membership.create([
    { user: rohit._id, organization: northline._id, role: 'OWNER' },
    { user: rahul._id, organization: northline._id, role: 'MANAGER' },
    { user: ananya._id, organization: northline._id, role: 'EMPLOYEE' },
    { user: priya._id, organization: northline._id, role: 'CLIENT', client: abc._id },
    { user: meera._id, organization: harbor._id, role: 'OWNER' },
  ]);

  const staff = [rohit._id, rahul._id, ananya._id];
  const website = await Project.create({
    organization: northline._id,
    client: abc._id,
    name: 'Website Development',
    description: 'Marketing site for ABC Pvt Ltd, from homepage through the first five pages.',
    status: 'ACTIVE',
    dueDate: daysAgo(-21),
    members: staff,
    createdBy: rohit._id,
    createdAt: daysAgo(12),
  });
  const seo = await Project.create({
    organization: northline._id,
    client: brightleaf._id,
    name: 'SEO Retainer',
    description: 'Monthly search work for Brightleaf Foods.',
    status: 'ACTIVE',
    dueDate: daysAgo(-10),
    members: staff,
    createdBy: rahul._id,
    createdAt: daysAgo(40),
  });
  const festival = await Project.create({
    organization: northline._id,
    client: abc._id,
    name: 'Festival Campaign',
    description: 'A short landing page for the monsoon offer.',
    status: 'COMPLETED',
    dueDate: onMonthOffset(-2, 20),
    members: staff,
    createdBy: rohit._id,
    createdAt: onMonthOffset(-2, 2),
  });
  const workshop = await Project.create({
    organization: northline._id,
    client: abc._id,
    name: 'Brand Workshop',
    description: 'Naming, tone, and a one-day working session.',
    status: 'COMPLETED',
    dueDate: onMonthOffset(-1, 12),
    members: [rohit._id, rahul._id],
    createdBy: rohit._id,
    createdAt: onMonthOffset(-1, 1),
  });
  await Project.create({
    organization: harbor._id,
    client: harborClient._id,
    name: 'Lobby Signage',
    description: 'A small wayfinding project. It belongs to Harbor, not Northline.',
    status: 'ACTIVE',
    members: [meera._id],
    createdBy: meera._id,
  });

  const discovery = await Milestone.create({
    organization: northline._id,
    project: website._id,
    title: 'Discovery',
    status: 'COMPLETED',
    dueDate: daysAgo(8),
  });
  await Milestone.create({
    organization: northline._id,
    project: website._id,
    title: 'Design',
    status: 'IN_PROGRESS',
    dueDate: daysAgo(-4),
  });
  const build = await Milestone.create({
    organization: northline._id,
    project: website._id,
    title: 'Build',
    status: 'PENDING',
    dueDate: daysAgo(-18),
  });

  await Task.create([
    {
      organization: northline._id,
      project: website._id,
      milestone: discovery._id,
      title: 'Kickoff notes',
      status: 'COMPLETED',
      assignee: rahul._id,
      dueDate: daysAgo(9),
      createdBy: rohit._id,
    },
    {
      organization: northline._id,
      project: website._id,
      milestone: build._id,
      title: 'Write homepage copy',
      description: 'First screen, proof points, and the contact line.',
      status: 'TODO',
      assignee: ananya._id,
      dueDate: daysAgo(1),
      createdBy: rahul._id,
    },
    {
      organization: northline._id,
      project: website._id,
      title: 'Build the hero section',
      status: 'IN_PROGRESS',
      assignee: rahul._id,
      dueDate: daysAgo(-3),
      createdBy: rohit._id,
    },
    {
      organization: northline._id,
      project: website._id,
      title: 'Review the color palette',
      status: 'REVIEW',
      assignee: ananya._id,
      dueDate: daysAgo(-1),
      createdBy: rahul._id,
    },
  ]);

  const homepage = await Deliverable.create({
    organization: northline._id,
    project: website._id,
    title: 'Homepage Design',
    status: 'PENDING_REVIEW',
  });
  const logo = await Deliverable.create({
    organization: northline._id,
    project: website._id,
    title: 'Logo',
    status: 'APPROVED',
  });

  const v1Size = writeFile('seed-homepage-v1.svg', homepageV1);
  const v2Size = writeFile('seed-homepage-v2.svg', homepageV2);
  const logoSize = writeFile('seed-logo.svg', logoSvg);

  const versionOne = await DeliverableVersion.create({
    organization: northline._id,
    deliverable: homepage._id,
    project: website._id,
    version: 1,
    fileName: 'homepage-v1.svg',
    mimeType: 'image/svg+xml',
    size: v1Size,
    storedName: 'seed-homepage-v1.svg',
    changeDescription: 'First pass of the homepage. Dark hero.',
    status: 'CHANGES_REQUESTED',
    uploadedBy: rahul._id,
    uploadedAt: daysAgo(5),
    decidedBy: priya._id,
    decidedAt: daysAgo(4),
  });
  await DeliverableVersion.create({
    organization: northline._id,
    deliverable: homepage._id,
    project: website._id,
    version: 2,
    fileName: 'homepage-v2.svg',
    mimeType: 'image/svg+xml',
    size: v2Size,
    storedName: 'seed-homepage-v2.svg',
    changeDescription: 'Lightened the hero and fixed the mobile headline.',
    status: 'PENDING_REVIEW',
    uploadedBy: ananya._id,
    uploadedAt: daysAgo(2),
  });
  await DeliverableVersion.create({
    organization: northline._id,
    deliverable: logo._id,
    project: website._id,
    version: 1,
    fileName: 'abc-logo.svg',
    mimeType: 'image/svg+xml',
    size: logoSize,
    storedName: 'seed-logo.svg',
    changeDescription: 'Wordmark on a dark circle.',
    status: 'APPROVED',
    uploadedBy: ananya._id,
    uploadedAt: daysAgo(7),
    decidedBy: priya._id,
    decidedAt: daysAgo(6),
  });
  await Comment.create({
    organization: northline._id,
    project: website._id,
    deliverable: homepage._id,
    version: versionOne._id,
    author: priya._id,
    body: 'The hero is too dark, and the headline is cut off on mobile.',
    createdAt: daysAgo(4),
  });

  const festivalPrice = priceInvoice([{ description: 'Festival landing page', amount: 40000 }], 18);
  const workshopPrice = priceInvoice([{ description: 'Brand workshop', amount: 65000 }], 18);
  const websitePrice = priceInvoice(
    [
      { description: 'Website Development', amount: 50000 },
      { description: 'SEO', amount: 20000 },
    ],
    18,
  );
  const seoPrice = priceInvoice([{ description: 'September SEO retainer', amount: 25000 }], 18);

  await Invoice.create([
    {
      organization: northline._id,
      project: festival._id,
      client: abc._id,
      number: 1022,
      status: 'PAID',
      ...festivalPrice,
      dueDate: onMonthOffset(-2, 20),
      sentAt: onMonthOffset(-2, 8),
      paidAt: onMonthOffset(-2, 12),
      paymentMethod: 'Bank transfer',
      paymentReference: 'NEFT-88421',
      createdBy: rohit._id,
    },
    {
      organization: northline._id,
      project: workshop._id,
      client: abc._id,
      number: 1023,
      status: 'PAID',
      ...workshopPrice,
      dueDate: onMonthOffset(-1, 20),
      sentAt: onMonthOffset(-1, 6),
      paidAt: onMonthOffset(-1, 18),
      paymentMethod: 'UPI',
      paymentReference: 'UPI-22910',
      createdBy: rohit._id,
    },
    {
      organization: northline._id,
      project: website._id,
      client: abc._id,
      number: 1024,
      status: 'SENT',
      ...websitePrice,
      dueDate: daysAgo(-14),
      sentAt: daysAgo(1),
      createdBy: rohit._id,
    },
    {
      organization: northline._id,
      project: seo._id,
      client: brightleaf._id,
      number: 1025,
      status: 'SENT',
      ...seoPrice,
      dueDate: daysAgo(20),
      sentAt: daysAgo(28),
      createdBy: rahul._id,
    },
  ]);

  await Activity.create([
    {
      organization: northline._id,
      project: website._id,
      actor: rohit._id,
      action: 'project.created',
      resource: 'project',
      resourceId: website._id,
      metadata: { name: 'Website Development' },
      createdAt: daysAgo(12),
    },
    {
      organization: northline._id,
      project: website._id,
      actor: rahul._id,
      action: 'deliverable.uploaded',
      resource: 'deliverable',
      resourceId: homepage._id,
      metadata: { title: 'Homepage Design', version: 1 },
      createdAt: daysAgo(5),
    },
    {
      organization: northline._id,
      project: website._id,
      actor: priya._id,
      action: 'deliverable.changes_requested',
      resource: 'deliverable',
      resourceId: homepage._id,
      metadata: { title: 'Homepage Design', version: 1 },
      createdAt: daysAgo(4),
    },
    {
      organization: northline._id,
      project: website._id,
      actor: priya._id,
      action: 'deliverable.approved',
      resource: 'deliverable',
      resourceId: logo._id,
      metadata: { title: 'Logo', version: 1 },
      createdAt: daysAgo(6),
    },
    {
      organization: northline._id,
      project: website._id,
      actor: ananya._id,
      action: 'deliverable.uploaded',
      resource: 'deliverable',
      resourceId: homepage._id,
      metadata: { title: 'Homepage Design', version: 2 },
      createdAt: daysAgo(2),
    },
    {
      organization: northline._id,
      project: website._id,
      actor: rohit._id,
      action: 'invoice.sent',
      resource: 'invoice',
      resourceId: website._id,
      metadata: { number: 1024 },
      createdAt: daysAgo(1),
    },
  ]);

  await Notification.create([
    {
      organization: northline._id,
      user: rohit._id,
      type: 'approval',
      title: 'Homepage Design v2 is in review',
      body: 'Priya can approve it or ask for another pass.',
      link: `/app/projects/${website._id}`,
      read: false,
    },
    {
      organization: northline._id,
      user: ananya._id,
      type: 'task',
      title: 'You were assigned “Write homepage copy”',
      body: 'Website Development',
      link: `/app/projects/${website._id}`,
      read: false,
    },
    {
      organization: northline._id,
      user: priya._id,
      type: 'deliverable',
      title: 'Homepage Design v2 is ready',
      body: 'Lightened the hero and fixed the mobile headline.',
      link: `/app/projects/${website._id}`,
      read: false,
    },
    {
      organization: northline._id,
      user: priya._id,
      type: 'invoice',
      title: 'Invoice #1024 is ready',
      body: 'Website Development and SEO.',
      link: '/app/invoices',
      read: false,
    },
  ]);

  await markOverdueInvoices();
  console.log('Seeded Northline Studio and Harbor & Co.');
  console.log(`Demo password for every account: ${PASSWORD}`);
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(path.dirname(new URL(import.meta.url).pathname), 'seed.js');

if (isDirect) {
  const dotenv = await import('dotenv');
  dotenv.config({ path: path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../.env') });
  const { connectDb } = await import('../config/db.js');
  await connectDb();
  await seed();
  process.exit(0);
}
