import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { db } from "../src/lib/db";
import { invoiceTotals, rupeesToPaise } from "../src/lib/money";

function days(offset: number) {
  return new Date(Date.now() + offset * 24 * 60 * 60 * 1000);
}

function previewSvg(label: string, color: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600">
  <rect width="960" height="600" fill="${color}"/>
  <text x="64" y="290" fill="#f6f1e7" font-family="Georgia" font-size="42">${label}</text>
</svg>`;
}

async function writePreview(organizationId: string, label: string, color: string) {
  const id = randomUUID();
  const body = previewSvg(label, color);
  const storageKey = `${organizationId}/${id}.svg`;
  const full = path.join(process.cwd(), "storage", storageKey);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, body);
  return {
    id,
    storageKey,
    byteSize: Buffer.byteLength(body),
    fileName: `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.svg`,
  };
}

async function wipe() {
  await db.comment.deleteMany();
  await db.deliverableVersion.deleteMany();
  await db.deliverable.deleteMany();
  await db.task.deleteMany();
  await db.milestone.deleteMany();
  await db.projectMember.deleteMany();
  await db.invoiceLine.deleteMany();
  await db.invoice.deleteMany();
  await db.notification.deleteMany();
  await db.activityLog.deleteMany();
  await db.outboundMessage.deleteMany();
  await db.jobRun.deleteMany();
  await db.membership.deleteMany();
  await db.project.deleteMany();
  await db.client.deleteMany();
  await db.organization.deleteMany();
  await db.user.deleteMany();
  await fs.rm(path.join(process.cwd(), "storage"), { recursive: true, force: true });
}

async function main() {
  const existingUsers = await db.user.count();
  if (existingUsers > 0) {
    console.log("Database already has users. Leaving it in place.");
    return;
  }
  await wipe();
  const passwordHash = await bcrypt.hash("clientflow", 10);

  const northline = await db.organization.create({
    data: { name: "Northline Studio", slug: "northline", plan: "PRO", invoiceSeq: 1028 },
  });
  const harbor = await db.organization.create({
    data: { name: "Harbor & Co", slug: "harbor", plan: "FREE", invoiceSeq: 100 },
  });

  const rohit = await db.user.create({ data: { name: "Rohit", email: "rohit@northline.studio", passwordHash } });
  const rahul = await db.user.create({ data: { name: "Rahul", email: "rahul@northline.studio", passwordHash } });
  const meera = await db.user.create({ data: { name: "Meera", email: "meera@northline.studio", passwordHash } });
  const priya = await db.user.create({ data: { name: "Priya Shah", email: "priya@abcpvt.com", passwordHash } });
  const anika = await db.user.create({ data: { name: "Anika Rao", email: "anika@harbor.co", passwordHash } });

  const abc = await db.client.create({
    data: {
      organizationId: northline.id,
      company: "ABC Pvt Ltd",
      contactName: "Priya Shah",
      email: "priya@abcpvt.com",
      phone: "9845011122",
    },
  });
  const kite = await db.client.create({
    data: {
      organizationId: northline.id,
      company: "Kite & Co",
      contactName: "Arjun Mehta",
      email: "arjun@kite.co",
    },
  });
  const northwind = await db.client.create({
    data: {
      organizationId: northline.id,
      company: "Northwind Foods",
      contactName: "Lena Das",
      email: "lena@northwind.example",
    },
  });
  const pier = await db.client.create({
    data: { organizationId: harbor.id, company: "Pier Cafe", contactName: "Dev Patel", email: "dev@pier.example" },
  });
  const salt = await db.client.create({
    data: { organizationId: harbor.id, company: "Salt House", contactName: "Nina Paul", email: "nina@salt.example" },
  });

  await db.membership.createMany({
    data: [
      { userId: rohit.id, organizationId: northline.id, role: "OWNER" },
      { userId: rahul.id, organizationId: northline.id, role: "MANAGER" },
      { userId: meera.id, organizationId: northline.id, role: "EMPLOYEE" },
      { userId: priya.id, organizationId: northline.id, role: "CLIENT", clientId: abc.id },
      { userId: anika.id, organizationId: harbor.id, role: "OWNER" },
    ],
  });

  const website = await db.project.create({
    data: {
      organizationId: northline.id,
      clientId: abc.id,
      name: "Website Development",
      description: "Marketing site and SEO pages for ABC Pvt Ltd.",
      status: "ACTIVE",
      startDate: days(-20),
      dueDate: days(21),
      members: { create: [{ userId: rohit.id }, { userId: rahul.id }, { userId: meera.id }] },
    },
  });
  const brand = await db.project.create({
    data: {
      organizationId: northline.id,
      clientId: abc.id,
      name: "Brand system",
      description: "Wordmark and color for ABC.",
      status: "ACTIVE",
      startDate: days(-40),
      dueDate: days(10),
      members: { create: [{ userId: rahul.id }, { userId: meera.id }] },
    },
  });
  const campaign = await db.project.create({
    data: {
      organizationId: northline.id,
      clientId: kite.id,
      name: "Campaign landing page",
      description: "One page for the spring offer.",
      status: "PLANNING",
      dueDate: days(30),
      members: { create: [{ userId: rohit.id }] },
    },
  });
  const packaging = await db.project.create({
    data: {
      organizationId: northline.id,
      clientId: northwind.id,
      name: "Packaging refresh",
      description: "Tin dieline and label.",
      status: "COMPLETED",
      startDate: days(-50),
      dueDate: days(-5),
      members: { create: [{ userId: meera.id }] },
    },
  });
  const pierSite = await db.project.create({
    data: {
      organizationId: harbor.id,
      clientId: pier.id,
      name: "Pier site refresh",
      status: "ACTIVE",
      members: { create: [{ userId: anika.id }] },
    },
  });
  await db.project.create({
    data: {
      organizationId: harbor.id,
      clientId: salt.id,
      name: "Summer menu",
      status: "PLANNING",
      members: { create: [{ userId: anika.id }] },
    },
  });

  const designSignoff = await db.milestone.create({
    data: { projectId: website.id, title: "Design sign-off", dueDate: days(7) },
  });
  await db.milestone.create({ data: { projectId: website.id, title: "Launch", dueDate: days(21) } });

  const homepageTask = await db.task.create({
    data: {
      organizationId: northline.id,
      projectId: website.id,
      milestoneId: designSignoff.id,
      title: "Build the homepage",
      status: "IN_PROGRESS",
      assigneeId: meera.id,
      dueDate: days(-1),
    },
  });
  await db.task.create({
    data: {
      organizationId: northline.id,
      projectId: website.id,
      title: "Write the brief",
      status: "COMPLETED",
      assigneeId: meera.id,
      dueDate: days(-14),
    },
  });
  await db.task.create({
    data: {
      organizationId: northline.id,
      projectId: website.id,
      title: "Review the SEO page",
      status: "REVIEW",
      assigneeId: rahul.id,
      dueDate: days(3),
    },
  });
  await db.task.create({
    data: {
      organizationId: northline.id,
      projectId: website.id,
      title: "Prepare the launch checklist",
      status: "TODO",
      dueDate: days(10),
    },
  });
  await db.task.create({
    data: {
      organizationId: northline.id,
      projectId: campaign.id,
      title: "Collect the offer",
      status: "TODO",
    },
  });
  await db.task.create({
    data: {
      organizationId: northline.id,
      projectId: packaging.id,
      title: "Export the dieline",
      status: "COMPLETED",
      assigneeId: meera.id,
      dueDate: days(-12),
    },
  });

  const homeV1 = await writePreview(northline.id, "Homepage v1", "#243028");
  const homeV2 = await writePreview(northline.id, "Homepage v2", "#e7d7c3");
  const homepage = await db.deliverable.create({
    data: {
      organizationId: northline.id,
      projectId: website.id,
      title: "Homepage Design",
      createdAt: days(-12),
      versions: {
        create: [
          {
            id: homeV1.id,
            organizationId: northline.id,
            version: 1,
            fileName: homeV1.fileName,
            storageKey: homeV1.storageKey,
            contentType: "image/svg+xml",
            byteSize: homeV1.byteSize,
            changeDescription: "First pass with a dark hero.",
            status: "CHANGES_REQUESTED",
            uploadedById: rahul.id,
            uploadedAt: days(-12),
          },
          {
            id: homeV2.id,
            organizationId: northline.id,
            version: 2,
            fileName: homeV2.fileName,
            storageKey: homeV2.storageKey,
            contentType: "image/svg+xml",
            byteSize: homeV2.byteSize,
            changeDescription: "Lightened the hero and rewrote the headline.",
            status: "PENDING",
            uploadedById: rahul.id,
            uploadedAt: days(-2),
          },
        ],
      },
    },
    include: { versions: true },
  });

  const logoFiles = await Promise.all([
    writePreview(northline.id, "Logo v1", "#1a2e28"),
    writePreview(northline.id, "Logo v2", "#31584c"),
    writePreview(northline.id, "Logo v3", "#b85c38"),
  ]);
  await db.deliverable.create({
    data: {
      organizationId: northline.id,
      projectId: brand.id,
      title: "Logo Design",
      versions: {
        create: [
          {
            id: logoFiles[0].id,
            organizationId: northline.id,
            version: 1,
            fileName: logoFiles[0].fileName,
            storageKey: logoFiles[0].storageKey,
            contentType: "image/svg+xml",
            byteSize: logoFiles[0].byteSize,
            changeDescription: "Thin wordmark.",
            status: "CHANGES_REQUESTED",
            uploadedById: meera.id,
            uploadedAt: days(-30),
          },
          {
            id: logoFiles[1].id,
            organizationId: northline.id,
            version: 2,
            fileName: logoFiles[1].fileName,
            storageKey: logoFiles[1].storageKey,
            contentType: "image/svg+xml",
            byteSize: logoFiles[1].byteSize,
            changeDescription: "Heavier strokes. Spacing still tight.",
            status: "CHANGES_REQUESTED",
            uploadedById: meera.id,
            uploadedAt: days(-18),
          },
          {
            id: logoFiles[2].id,
            organizationId: northline.id,
            version: 3,
            fileName: logoFiles[2].fileName,
            storageKey: logoFiles[2].storageKey,
            contentType: "image/svg+xml",
            byteSize: logoFiles[2].byteSize,
            changeDescription: "Final wordmark and copper mark.",
            status: "APPROVED",
            uploadedById: meera.id,
            uploadedAt: days(-6),
          },
        ],
      },
    },
  });

  const packFile = await writePreview(northline.id, "Packaging v1", "#8f3b36");
  await db.deliverable.create({
    data: {
      organizationId: northline.id,
      projectId: packaging.id,
      title: "Packaging dieline",
      versions: {
        create: {
          id: packFile.id,
          organizationId: northline.id,
          version: 1,
          fileName: packFile.fileName,
          storageKey: packFile.storageKey,
          contentType: "image/svg+xml",
          byteSize: packFile.byteSize,
          changeDescription: "Tin dieline approved for print.",
          status: "APPROVED",
          uploadedById: meera.id,
          uploadedAt: days(-12),
        },
      },
    },
  });

  const homeVersion1 = homepage.versions.find((version) => version.version === 1);
  if (!homeVersion1) throw new Error("Homepage v1 missing.");
  await db.comment.create({
    data: {
      organizationId: northline.id,
      versionId: homeVersion1.id,
      authorId: priya.id,
      body: "The hero is too dark, and the headline should say the offer.",
      createdAt: days(-10),
    },
  });

  const gst = invoiceTotals([rupeesToPaise("50000")!, rupeesToPaise("20000")!], 18);
  if (gst.total !== 8_260_000) throw new Error("Expected the sample invoice to total ₹82,600.");

  const packagingTotals = invoiceTotals([rupeesToPaise("40000")!], 18);
  const brandTotals = invoiceTotals([rupeesToPaise("18000")!], 18);
  const draftTotals = invoiceTotals([rupeesToPaise("25000")!], 18);
  const supportTotals = invoiceTotals([rupeesToPaise("15000")!], 0);
  const harborTotals = invoiceTotals([rupeesToPaise("8000")!], 0);

  const invoice1024 = await db.invoice.create({
    data: {
      organizationId: northline.id,
      projectId: website.id,
      clientId: abc.id,
      number: "INV-1024",
      status: "SENT",
      subtotal: gst.subtotal,
      taxRate: 18,
      tax: gst.tax,
      total: gst.total,
      dueDate: days(-1),
      sentAt: days(-3),
      lines: {
        create: [
          { description: "Website Development", amount: rupeesToPaise("50000")!, position: 0 },
          { description: "SEO", amount: rupeesToPaise("20000")!, position: 1 },
        ],
      },
    },
  });
  await db.invoice.create({
    data: {
      organizationId: northline.id,
      projectId: packaging.id,
      clientId: northwind.id,
      number: "INV-1025",
      status: "PAID",
      subtotal: packagingTotals.subtotal,
      taxRate: 18,
      tax: packagingTotals.tax,
      total: packagingTotals.total,
      dueDate: days(-45),
      sentAt: days(-50),
      paidAt: days(-40),
      lines: { create: [{ description: "Packaging design", amount: rupeesToPaise("40000")!, position: 0 }] },
    },
  });
  await db.invoice.create({
    data: {
      organizationId: northline.id,
      projectId: brand.id,
      clientId: abc.id,
      number: "INV-1026",
      status: "PAID",
      subtotal: brandTotals.subtotal,
      taxRate: 18,
      tax: brandTotals.tax,
      total: brandTotals.total,
      dueDate: days(-12),
      sentAt: days(-20),
      paidAt: days(-10),
      lines: { create: [{ description: "Logo design", amount: rupeesToPaise("18000")!, position: 0 }] },
    },
  });
  await db.invoice.create({
    data: {
      organizationId: northline.id,
      projectId: campaign.id,
      clientId: kite.id,
      number: "INV-1027",
      status: "DRAFT",
      subtotal: draftTotals.subtotal,
      taxRate: 18,
      tax: draftTotals.tax,
      total: draftTotals.total,
      dueDate: days(14),
      lines: { create: [{ description: "Landing page", amount: rupeesToPaise("25000")!, position: 0 }] },
    },
  });
  await db.invoice.create({
    data: {
      organizationId: northline.id,
      projectId: website.id,
      clientId: abc.id,
      number: "INV-1028",
      status: "PAID",
      subtotal: supportTotals.subtotal,
      taxRate: 0,
      tax: supportTotals.tax,
      total: supportTotals.total,
      dueDate: days(-2),
      sentAt: days(-4),
      paidAt: days(-1),
      lines: { create: [{ description: "Content support", amount: rupeesToPaise("15000")!, position: 0 }] },
    },
  });
  await db.invoice.create({
    data: {
      organizationId: harbor.id,
      projectId: pierSite.id,
      clientId: pier.id,
      number: "INV-100",
      status: "DRAFT",
      subtotal: harborTotals.subtotal,
      taxRate: 0,
      tax: harborTotals.tax,
      total: harborTotals.total,
      dueDate: days(7),
      lines: { create: [{ description: "Site refresh", amount: rupeesToPaise("8000")!, position: 0 }] },
    },
  });

  await db.activityLog.createMany({
    data: [
      {
        organizationId: northline.id,
        actorId: rohit.id,
        action: "project.created",
        resource: "project",
        resourceId: website.id,
        summary: "Rohit created project Website Development",
        createdAt: days(-20),
      },
      {
        organizationId: northline.id,
        actorId: rahul.id,
        action: "deliverable.created",
        resource: "deliverable",
        resourceId: homepage.id,
        summary: "Rahul uploaded Homepage Design v1",
        createdAt: days(-12),
      },
      {
        organizationId: northline.id,
        actorId: priya.id,
        action: "deliverable.changes_requested",
        resource: "deliverable",
        resourceId: homepage.id,
        summary: "Priya Shah requested changes on Homepage Design v1",
        createdAt: days(-10),
      },
      {
        organizationId: northline.id,
        actorId: rahul.id,
        action: "deliverable.version_added",
        resource: "deliverable",
        resourceId: homepage.id,
        summary: "Rahul uploaded Homepage Design v2",
        createdAt: days(-2),
      },
      {
        organizationId: northline.id,
        actorId: rohit.id,
        action: "invoice.created",
        resource: "invoice",
        resourceId: invoice1024.id,
        summary: "Rohit created invoice INV-1024",
        createdAt: days(-3),
      },
    ],
  });

  await db.notification.createMany({
    data: [
      {
        organizationId: northline.id,
        userId: rohit.id,
        title: "Changes requested on Homepage Design v1",
        body: "Priya Shah asked for a lighter hero and a headline that states the offer.",
        createdAt: days(-10),
      },
      {
        organizationId: northline.id,
        userId: meera.id,
        title: "You were assigned Build the homepage",
        body: "The task is on Website Development and the due date has passed.",
        createdAt: days(-4),
      },
    ],
  });

  await db.outboundMessage.create({
    data: {
      organizationId: northline.id,
      toEmail: meera.email,
      subject: "You were assigned Build the homepage",
      body: "Rahul assigned you “Build the homepage” on Website Development.",
      status: "PENDING",
      createdAt: days(-4),
    },
  });

  console.log("Seeded Northline Studio and Harbor & Co. Password: clientflow");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
