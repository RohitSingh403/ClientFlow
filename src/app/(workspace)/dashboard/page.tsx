import Link from "next/link";
import { JobButton } from "@/components/forms";
import { PageHeader, StatusPill } from "@/components/ui";
import { db } from "@/lib/db";
import { PLANS } from "@/lib/entitlements";
import { formatINR } from "@/lib/money";
import { can } from "@/lib/permissions";
import { projectWhere } from "@/lib/scope";
import { PROJECT_LABEL, TASK_LABEL } from "@/lib/format";
import { PROJECT_STATUSES, TASK_STATUSES } from "@/lib/workflow";
import { requireUser } from "@/server/guard";

export const metadata = { title: "Overview" };

export default async function DashboardPage() {
  const ctx = await requireUser();
  if (ctx.role === "CLIENT") return <ClientHome />;

  const where = projectWhere(ctx);
  const [projects, tasks, pendingDeliverables, invoices, pastDue, activities] = await Promise.all([
    db.project.findMany({ where, include: { client: true, tasks: true } }),
    db.task.findMany({ where: { project: where } }),
    db.deliverable.findMany({
      where: { project: where },
      include: { versions: { orderBy: { version: "desc" }, take: 1 }, project: true },
    }),
    db.invoice.findMany({ where: { organizationId: ctx.organizationId } }),
    db.invoice.count({
      where: {
        organizationId: ctx.organizationId,
        status: { in: ["SENT", "VIEWED"] },
        dueDate: { lt: new Date() },
      },
    }),
    db.activityLog.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const pending = pendingDeliverables.filter((item) => item.versions[0]?.status === "PENDING");
  const showMoney = can(ctx.role, "invoice:view");
  const outstanding = invoices.filter((invoice) => ["SENT", "VIEWED", "OVERDUE"].includes(invoice.status));
  const paid = invoices.filter((invoice) => invoice.status === "PAID");
  const overdueTasks = tasks.filter((task) => task.dueDate && task.dueDate < new Date() && task.status !== "COMPLETED");
  const plan = PLANS[ctx.organization.plan];
  const showCharts = can(ctx.role, "analytics:view") && plan.analytics;
  const lockCharts = can(ctx.role, "analytics:view") && !plan.analytics;

  return (
    <div>
      <PageHeader eyebrow="Workspace" title={projects.length === 0 ? "Start with a client" : "Overview"} />
      {pastDue > 0 ? (
        <section className="card mb-6 flex flex-wrap items-center justify-between gap-4 border-bad/30">
          <div>
            <p className="font-medium">
              {pastDue} invoice{pastDue === 1 ? "" : "s"} past due, still marked sent or viewed.
            </p>
            <p className="text-sm text-muted">The reminder job is what moves them to overdue and queues the email.</p>
          </div>
          {can(ctx.role, "jobs:run") ? <JobButton /> : null}
        </section>
      ) : null}
      {projects.length === 0 ? (
        <section className="card">
          <p>This workspace has no projects yet.</p>
          <div className="mt-4 flex gap-2">
            {can(ctx.role, "client:view") ? (
              <Link className="btn btn-primary" href="/clients">
                Add a client
              </Link>
            ) : null}
            <Link className="btn btn-ghost" href="/projects">
              Projects
            </Link>
          </div>
        </section>
      ) : (
        <section className="grid gap-3 md:grid-cols-3">
          <Stat label="Active projects" value={String(projects.filter((project) => project.status === "ACTIVE").length)} />
          <Stat label="Pending approvals" value={String(pending.length)} />
          <Stat label="Overdue tasks" value={String(overdueTasks.length)} />
          {showMoney ? (
            <>
              <Stat label="Outstanding" value={formatINR(outstanding.reduce((sum, invoice) => sum + invoice.total, 0))} />
              <Stat label="Collected" value={formatINR(paid.reduce((sum, invoice) => sum + invoice.total, 0))} />
              <Stat label="Completed projects" value={String(projects.filter((project) => project.status === "COMPLETED").length)} />
            </>
          ) : null}
        </section>
      )}

      {showCharts ? <Charts projects={projects} tasks={tasks} invoices={invoices} /> : null}
      {lockCharts ? (
        <section className="card mt-6">
          <h2 className="font-serif text-2xl">Analytics is on Pro and Business</h2>
          <p className="mt-2 text-sm text-muted">
            {ctx.organization.name} is on {plan.label}. Operational counts stay available. Charts unlock when the plan includes them.
          </p>
          {can(ctx.role, "settings:view") ? (
            <Link className="btn btn-ghost mt-4" href="/settings">
              Review plan
            </Link>
          ) : null}
        </section>
      ) : null}

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-serif text-2xl">Projects</h2>
          <div className="grid gap-2">
            {projects.slice(0, 5).map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="card flex items-center justify-between gap-3">
                <span>
                  <span className="block font-medium">{project.name}</span>
                  <span className="text-sm text-muted">{project.client.company}</span>
                </span>
                <StatusPill status={project.status} />
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-3 font-serif text-2xl">Recent activity</h2>
          <div className="grid gap-2">
            {activities.length === 0 ? <p className="text-sm text-muted">Nothing has been recorded yet.</p> : null}
            {activities.map((entry) => (
              <article key={entry.id} className="card">
                <p>{entry.summary}</p>
                <p className="mt-1 text-xs text-muted">{entry.action}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

async function ClientHome() {
  const ctx = await requireUser();
  const where = projectWhere(ctx);
  const [projects, deliverables, invoices] = await Promise.all([
    db.project.findMany({ where, include: { client: true }, orderBy: { updatedAt: "desc" } }),
    db.deliverable.findMany({
      where: { project: where },
      include: { versions: { orderBy: { version: "desc" }, take: 1 }, project: true },
    }),
    db.invoice.findMany({
      where: { organizationId: ctx.organizationId, clientId: ctx.clientId ?? "__deny__" },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const pending = deliverables.filter((item) => item.versions[0]?.status === "PENDING");
  return (
    <div>
      <PageHeader eyebrow="Client portal" title="Waiting on you" />
      <section className="grid gap-3">
        {pending.length === 0 ? <p className="text-muted">Nothing is waiting for review.</p> : null}
        {pending.map((item) => (
          <Link key={item.id} href={`/projects/${item.projectId}#${item.id}`} className="card flex items-center justify-between">
            <span>
              <span className="block font-medium">{item.title}</span>
              <span className="text-sm text-muted">{item.project.name}</span>
            </span>
            <StatusPill status="PENDING" />
          </Link>
        ))}
      </section>
      <h2 className="mb-3 mt-8 font-serif text-2xl">Projects</h2>
      <div className="grid gap-2">
        {projects.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`} className="card flex justify-between">
            <span>{project.name}</span>
            <StatusPill status={project.status} />
          </Link>
        ))}
      </div>
      <h2 className="mb-3 mt-8 font-serif text-2xl">Invoices</h2>
      <div className="grid gap-2">
        {invoices.map((invoice) => (
          <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="card flex justify-between">
            <span>
              {invoice.number} · {formatINR(invoice.total)}
            </span>
            <StatusPill status={invoice.status} />
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="card">
      <p className="text-sm text-muted">{label}</p>
      <p className="stat mt-2">{value}</p>
    </article>
  );
}

function Charts({
  projects,
  tasks,
  invoices,
}: {
  projects: { status: string }[];
  tasks: { status: string }[];
  invoices: { status: string; total: number; paidAt: Date | null }[];
}) {
  const months = lastMonths(6);
  const points = months.map((month) => {
    const amount = invoices
      .filter((invoice) => invoice.status === "PAID" && invoice.paidAt && sameMonth(invoice.paidAt, month))
      .reduce((sum, invoice) => sum + invoice.total, 0);
    return {
      label: new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" }).format(month),
      amount,
    };
  });
  const max = Math.max(...points.map((point) => point.amount), 1);
  const paidTotal = invoices.filter((invoice) => invoice.status === "PAID").reduce((sum, invoice) => sum + invoice.total, 0);
  const openTotal = invoices
    .filter((invoice) => ["SENT", "VIEWED", "OVERDUE"].includes(invoice.status))
    .reduce((sum, invoice) => sum + invoice.total, 0);
  const collection = paidTotal + openTotal === 0 ? 0 : Math.round((paidTotal / (paidTotal + openTotal)) * 100);
  const doneTasks = tasks.filter((task) => task.status === "COMPLETED").length;
  const taskRate = tasks.length === 0 ? 0 : Math.round((doneTasks / tasks.length) * 100);

  return (
    <section className="mt-6 grid gap-3 lg:grid-cols-2">
      <article className="card">
        <h2 className="font-serif text-2xl">Revenue</h2>
        <svg viewBox="0 0 360 150" className="mt-3 h-36 w-full" role="img" aria-label="Paid invoices by month">
          {points.map((point, index) => {
            const height = (point.amount / max) * 96;
            const x = 18 + index * 56;
            return (
              <g key={point.label}>
                <rect x={x} y={112 - height} width="28" height={Math.max(height, 2)} rx="4" fill="#1a2e28" />
                <text x={x + 14} y="132" textAnchor="middle" fontSize="11" fill="#6f675e">
                  {point.label}
                </text>
              </g>
            );
          })}
        </svg>
      </article>
      <article className="card">
        <h2 className="font-serif text-2xl">Projects by status</h2>
        <ul className="mt-3 grid gap-2">
          {PROJECT_STATUSES.map((status) => (
            <li key={status} className="flex justify-between text-sm">
              <span>{PROJECT_LABEL[status]}</span>
              <span className="num">{projects.filter((project) => project.status === status).length}</span>
            </li>
          ))}
        </ul>
      </article>
      <article className="card">
        <h2 className="font-serif text-2xl">Invoice collection</h2>
        <p className="stat mt-3">{collection}%</p>
        <div className="meter">
          <span style={{ width: `${collection}%` }} />
        </div>
        <p className="mt-2 text-sm text-muted">Paid amount against paid plus still open.</p>
      </article>
      <article className="card">
        <h2 className="font-serif text-2xl">Task completion</h2>
        <p className="stat mt-3">{taskRate}%</p>
        <ul className="mt-3 grid gap-1 text-sm">
          {TASK_STATUSES.map((status) => (
            <li key={status} className="flex justify-between">
              <span>{TASK_LABEL[status]}</span>
              <span className="num">{tasks.filter((task) => task.status === status).length}</span>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}

function lastMonths(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const offset = count - 1 - index;
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
  });
}

function sameMonth(date: Date, month: Date) {
  return date.getUTCFullYear() === month.getUTCFullYear() && date.getUTCMonth() === month.getUTCMonth();
}
