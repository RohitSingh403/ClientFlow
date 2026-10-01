import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { formatWhen } from "@/lib/format";
import { can } from "@/lib/permissions";
import { requireUser } from "@/server/guard";

export const metadata = { title: "Activity" };

export default async function ActivityPage() {
  const ctx = await requireUser();
  if (!can(ctx.role, "activity:view")) return null;
  const entries = await db.activityLog.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: true },
  });

  return (
    <div>
      <PageHeader eyebrow="Audit" title="Activity" />
      <div className="grid gap-2">
        {entries.length === 0 ? <p className="text-muted">No activity yet.</p> : null}
        {entries.map((entry) => (
          <article key={entry.id} className="card">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p>{entry.summary}</p>
              <time className="text-xs text-muted">{formatWhen(entry.createdAt)}</time>
            </div>
            <p className="mt-1 text-xs text-muted">
              {entry.actor?.name ?? "ClientFlow"} · {entry.action} · {entry.resource} · {entry.resourceId}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
