import Link from "next/link";
import { PageHeader, StatusPill } from "@/components/ui";
import { db } from "@/lib/db";
import { projectWhere } from "@/lib/scope";
import { requireUser } from "@/server/guard";

export const metadata = { title: "Approvals" };

export default async function ApprovalsPage() {
  const ctx = await requireUser();
  const deliverables = await db.deliverable.findMany({
    where: { project: projectWhere(ctx) },
    include: {
      project: { include: { client: true } },
      versions: { orderBy: { version: "desc" }, take: 1, include: { uploadedBy: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const waiting = deliverables.filter((item) => item.versions[0]?.status === "PENDING");
  const changes = deliverables.filter((item) => item.versions[0]?.status === "CHANGES_REQUESTED");

  return (
    <div>
      <PageHeader eyebrow="Review" title="Approvals" />
      <section className="grid gap-6 lg:grid-cols-2">
        <Queue title="Waiting for the client" items={waiting} />
        <Queue title="Changes requested" items={changes} />
      </section>
    </div>
  );
}

function Queue({
  title,
  items,
}: {
  title: string;
  items: {
    id: string;
    title: string;
    projectId: string;
    project: { name: string; client: { company: string } };
    versions: { version: number; uploadedBy: { name: string } }[];
  }[];
}) {
  return (
    <div>
      <h2 className="mb-3 font-serif text-2xl">{title}</h2>
      <div className="grid gap-2">
        {items.length === 0 ? <p className="text-sm text-muted">Nothing in this queue.</p> : null}
        {items.map((item) => (
          <Link key={item.id} href={`/projects/${item.projectId}#${item.id}`} className="card flex items-center justify-between gap-3">
            <span>
              <span className="block font-medium">
                {item.title} v{item.versions[0]?.version}
              </span>
              <span className="text-sm text-muted">
                {item.project.client.company} · {item.project.name}
              </span>
            </span>
            <StatusPill status={title.startsWith("Waiting") ? "PENDING" : "CHANGES_REQUESTED"} />
          </Link>
        ))}
      </div>
    </div>
  );
}
