import { BrandForm, JobButton, PlanForm } from "@/components/forms";
import { Meter, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { PLANS, formatQuota } from "@/lib/entitlements";
import { formatBytes, formatWhen } from "@/lib/format";
import { can } from "@/lib/permissions";
import { requireUser, usageSnapshot } from "@/server/guard";

export const metadata = { title: "Plan and usage" };

export default async function SettingsPage() {
  const ctx = await requireUser();
  if (!can(ctx.role, "settings:view")) return null;
  const usage = await usageSnapshot(ctx.organizationId, ctx.organization.plan);
  const plan = PLANS[ctx.organization.plan];
  const [jobs, outbox] = await Promise.all([
    db.jobRun.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { ranAt: "desc" },
      take: 5,
    }),
    db.outboundMessage.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow={ctx.organization.name} title="Plan and usage" />
      <section className="card grid gap-4">
        <Meter label="Projects" used={usage.projects} limit={plan.projects} displayLimit={formatQuota(plan.projects)} />
        <Meter label="Clients" used={usage.clients} limit={plan.clients} displayLimit={formatQuota(plan.clients)} />
        <Meter label="Team members" used={usage.members} limit={plan.members} displayLimit={formatQuota(plan.members)} />
        <Meter
          label="Storage"
          used={usage.storageBytes}
          limit={plan.storageBytes}
          displayLimit={plan.storageLabel}
          usedLabel={formatBytes(usage.storageBytes)}
        />
        <p className="text-sm text-muted">Storage used: {formatBytes(usage.storageBytes)} of {plan.storageLabel}.</p>
      </section>

      <section className="card">
        <h2 className="font-serif text-2xl">Current plan · {plan.label}</h2>
        <p className="mt-1 text-sm text-muted">{plan.price}. Changing the plan is refused when current usage does not fit.</p>
        <div className="mt-4">
          {can(ctx.role, "billing:manage") ? <PlanForm current={ctx.organization.plan} /> : <p className="text-sm">Only the owner can change the plan.</p>}
        </div>
      </section>

      <section className="card">
        <h2 className="font-serif text-2xl">Custom branding</h2>
        {plan.branding ? (
          <div className="mt-3">
            <BrandForm color={ctx.organization.brandColor} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">Custom branding is included on Business. This workspace is on {plan.label}, so a saved color is not applied.</p>
        )}
      </section>

      {can(ctx.role, "jobs:run") ? (
        <section className="card">
          <h2 className="font-serif text-2xl">Background worker</h2>
          <p className="mt-2 mb-4 text-sm text-muted">
            Marks past-due sent invoices as overdue, then sends queued email. It only writes this organization’s log. A scheduler can call the same function through the jobs endpoint.
          </p>
          <JobButton />
          <ul className="mt-4 grid gap-2 text-sm">
            {jobs.length === 0 ? <li className="text-muted">The worker has not run for this workspace.</li> : null}
            {jobs.map((job) => (
              <li key={job.id}>
                {formatWhen(job.ranAt)} · {job.result}
              </li>
            ))}
          </ul>
          <h3 className="mt-6 font-medium">Outbox</h3>
          <ul className="mt-2 grid gap-2 text-sm">
            {outbox.length === 0 ? <li className="text-muted">No messages queued.</li> : null}
            {outbox.map((message) => (
              <li key={message.id} className="flex justify-between gap-3">
                <span>
                  {message.subject} → {message.toEmail}
                </span>
                <span className="text-muted">{message.status}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
