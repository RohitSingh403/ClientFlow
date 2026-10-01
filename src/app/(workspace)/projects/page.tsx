import Link from "next/link";
import { CreateProjectForm } from "@/components/forms";
import { PageHeader, StatusPill } from "@/components/ui";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { can } from "@/lib/permissions";
import { projectWhere } from "@/lib/scope";
import { isProjectStatus, PROJECT_STATUSES } from "@/lib/workflow";
import { PROJECT_LABEL } from "@/lib/format";
import { requireUser } from "@/server/guard";

export const metadata = { title: "Projects" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ status?: string; client?: string }> }) {
  const ctx = await requireUser();
  const params = await searchParams;
  const status = params.status && isProjectStatus(params.status) ? params.status : undefined;
  const projects = await db.project.findMany({
    where: {
      ...projectWhere(ctx),
      ...(status ? { status } : {}),
      ...(params.client && ctx.role !== "CLIENT" ? { clientId: params.client } : {}),
    },
    include: { client: true, tasks: true },
    orderBy: { updatedAt: "desc" },
  });
  const clients =
    can(ctx.role, "project:create")
      ? await db.client.findMany({ where: { organizationId: ctx.organizationId }, orderBy: { company: "asc" } })
      : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
      <div>
        <PageHeader eyebrow="Work" title="Projects" />
        <div className="mb-4 flex flex-wrap gap-2">
          <Filter href="/projects" label="All" active={!status} />
          {PROJECT_STATUSES.map((item) => (
            <Filter key={item} href={`/projects?status=${item}`} label={PROJECT_LABEL[item]} active={status === item} />
          ))}
        </div>
        <div className="grid gap-3">
          {projects.length === 0 ? <p className="text-muted">No projects in this view.</p> : null}
          {projects.map((project) => {
            const done = project.tasks.filter((task) => task.status === "COMPLETED").length;
            return (
              <Link key={project.id} href={`/projects/${project.id}`} className="card block">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-2xl">{project.name}</h2>
                    <p className="text-sm text-muted">{project.client.company}</p>
                  </div>
                  <StatusPill status={project.status} />
                </div>
                <p className="mt-3 text-sm text-muted">
                  {done}/{project.tasks.length} tasks · due {formatDate(project.dueDate)}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
      {can(ctx.role, "project:create") ? (
        <CreateProjectForm clients={clients.map((client) => ({ id: client.id, company: client.company }))} />
      ) : null}
    </div>
  );
}

function Filter({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href} className={`pill ${active ? "bg-pine text-cream" : ""}`}>
      {label}
    </Link>
  );
}
