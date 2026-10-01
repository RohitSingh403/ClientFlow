import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CommentForm,
  DeleteProjectForm,
  DeliverableForm,
  MilestoneForm,
  ProjectMemberForm,
  ProjectStatusForm,
  ReviewForm,
  TaskForm,
  TaskStatusForm,
  VersionForm,
} from "@/components/forms";
import { PageHeader, StatusPill } from "@/components/ui";
import { db } from "@/lib/db";
import { APPROVAL_LABEL, formatDate, formatWhen } from "@/lib/format";
import { formatINR } from "@/lib/money";
import { can } from "@/lib/permissions";
import { projectWhere } from "@/lib/scope";
import { canUploadNextVersion, isApprovalStatus, TASK_STATUSES } from "@/lib/workflow";
import { TASK_LABEL } from "@/lib/format";
import { isPreviewable } from "@/lib/files";
import { requireUser } from "@/server/guard";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireUser();
  const project = await db.project.findFirst({ where: { id, ...projectWhere(ctx) } });
  return { title: project?.name ?? "Project" };
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireUser();
  const project = await db.project.findFirst({
    where: { id, ...projectWhere(ctx) },
    include: {
      client: true,
      members: { include: { user: true } },
      milestones: { orderBy: { createdAt: "asc" } },
      tasks: { include: { assignee: true }, orderBy: { createdAt: "asc" } },
      deliverables: {
        include: {
          versions: {
            include: { uploadedBy: true, comments: { include: { author: true }, orderBy: { createdAt: "asc" } } },
            orderBy: { version: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      invoices: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) notFound();

  const staff = await db.membership.findMany({
    where: { organizationId: ctx.organizationId, role: { in: ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"] } },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });
  const people = staff.map((member) => ({ id: member.userId, name: member.user.name }));
  const done = project.tasks.filter((task) => task.status === "COMPLETED").length;

  return (
    <div className="grid gap-8">
      <div>
        <PageHeader eyebrow={project.client.company} title={project.name}>
          {can(ctx.role, "project:update") ? <ProjectStatusForm projectId={project.id} status={project.status} /> : <StatusPill status={project.status} />}
        </PageHeader>
        {project.description ? <p className="max-w-2xl text-muted">{project.description}</p> : null}
        <p className="mt-2 text-sm text-muted">
          {formatDate(project.startDate)} – {formatDate(project.dueDate)} · {done}/{project.tasks.length} tasks done
        </p>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1fr_16rem]">
        <div>
          <h2 className="mb-3 font-serif text-2xl">Milestones</h2>
          <div className="grid gap-2">
            {project.milestones.map((milestone) => (
              <form key={milestone.id} action={toggleMilestoneAction} className="card flex items-center justify-between gap-3">
                <div>
                  <p>{milestone.title}</p>
                  <p className="text-sm text-muted">{formatDate(milestone.dueDate)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={milestone.status} />
                  {can(ctx.role, "project:update") ? (
                    <>
                      <input type="hidden" name="milestoneId" value={milestone.id} />
                      <button className="btn btn-ghost" type="submit">
                        {milestone.status === "DONE" ? "Reopen" : "Mark done"}
                      </button>
                    </>
                  ) : null}
                </div>
              </form>
            ))}
            {project.milestones.length === 0 ? <p className="text-sm text-muted">No milestones yet.</p> : null}
          </div>
        </div>
        {can(ctx.role, "project:update") ? <MilestoneForm projectId={project.id} /> : null}
      </section>

      <section>
        <h2 className="mb-3 font-serif text-2xl">Tasks</h2>
        {can(ctx.role, "task:create") ? (
          <div className="mb-4">
            <TaskForm projectId={project.id} people={people} milestones={project.milestones.map((milestone) => ({ id: milestone.id, title: milestone.title }))} />
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-4">
          {TASK_STATUSES.map((status) => (
            <section key={status} className="rounded-2xl border border-line bg-white/50 p-3">
              <h3 className="mb-2 text-sm text-muted">{TASK_LABEL[status]}</h3>
              <div className="grid gap-2">
                {project.tasks
                  .filter((task) => task.status === status)
                  .map((task) => (
                    <article key={task.id} className="card">
                      <p className="font-medium">{task.title}</p>
                      <p className="mt-1 text-xs text-muted">
                        {task.assignee?.name ?? "Unassigned"}
                        {task.dueDate ? ` · ${formatDate(task.dueDate)}` : ""}
                      </p>
                      {can(ctx.role, "task:update") ? <TaskStatusForm taskId={task.id} status={task.status} /> : null}
                    </article>
                  ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="font-serif text-2xl">Deliverables</h2>
        {project.deliverables.map((deliverable) => {
          const latest = deliverable.versions[deliverable.versions.length - 1];
          const latestStatus = latest && isApprovalStatus(latest.status) ? latest.status : null;
          return (
            <article key={deliverable.id} id={deliverable.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="font-serif text-2xl">{deliverable.title}</h3>
                {latestStatus ? <StatusPill status={latestStatus} /> : null}
              </div>
              <ol className="mt-4 grid gap-4">
                {deliverable.versions.map((version) => (
                  <li key={version.id} className="grid gap-3 border-t border-line pt-4 md:grid-cols-[16rem_1fr]">
                    <div>
                      {isPreviewable(version.contentType) ? (
                        // Authenticated file route, so the optimizer cannot fetch it.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/files/${version.id}`}
                          alt={`${deliverable.title} version ${version.version}`}
                          className="w-full rounded-xl border border-line bg-white"
                        />
                      ) : (
                        <a className="btn btn-ghost" href={`/api/files/${version.id}`}>
                          Open file
                        </a>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        v{version.version} · {APPROVAL_LABEL[version.status as keyof typeof APPROVAL_LABEL] ?? version.status}
                      </p>
                      <p className="text-sm text-muted">
                        {version.uploadedBy.name} · {formatWhen(version.uploadedAt)}
                      </p>
                      {version.changeDescription ? <p className="mt-2 text-sm">{version.changeDescription}</p> : null}
                      <ul className="mt-3 grid gap-2">
                        {version.comments.map((comment) => (
                          <li key={comment.id} className="rounded-xl bg-white px-3 py-2 text-sm">
                            <span className="font-medium">{comment.author.name}. </span>
                            {comment.body}
                          </li>
                        ))}
                      </ul>
                      {can(ctx.role, "deliverable:comment") ? <CommentForm versionId={version.id} /> : null}
                      {can(ctx.role, "deliverable:approve") && latest?.id === version.id && version.status === "PENDING" ? (
                        <ReviewForm versionId={version.id} />
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
              {can(ctx.role, "deliverable:create") && latestStatus && canUploadNextVersion(latestStatus) ? (
                <VersionForm deliverableId={deliverable.id} />
              ) : null}
            </article>
          );
        })}
        {can(ctx.role, "deliverable:create") ? <DeliverableForm projectId={project.id} /> : null}
      </section>

      {can(ctx.role, "invoice:view") ? (
        <section>
          <h2 className="mb-3 font-serif text-2xl">Invoices</h2>
          <div className="grid gap-2">
            {project.invoices.map((invoice) => (
              <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="card flex justify-between">
                <span>
                  {invoice.number} · {formatINR(invoice.total)}
                </span>
                <StatusPill status={invoice.status} />
              </Link>
            ))}
            {project.invoices.length === 0 ? <p className="text-sm text-muted">No invoices on this project.</p> : null}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <div>
          <h2 className="mb-3 font-serif text-2xl">Team on this project</h2>
          <ul className="grid gap-2">
            {project.members.map((member) => (
              <li key={member.id} className="card">
                {member.user.name}
              </li>
            ))}
          </ul>
          {can(ctx.role, "project:update") ? (
            <div className="mt-3">
              <ProjectMemberForm projectId={project.id} people={people} />
            </div>
          ) : null}
        </div>
        {can(ctx.role, "project:delete") ? (
          <div className="card">
            <h2 className="font-serif text-2xl">Delete</h2>
            <p className="mt-2 mb-3 text-sm text-muted">A project with invoices cannot be deleted.</p>
            <DeleteProjectForm projectId={project.id} />
          </div>
        ) : null}
      </section>
    </div>
  );
}

async function toggleMilestoneAction(formData: FormData) {
  "use server";
  const { toggleMilestone } = await import("@/server/workspace");
  await toggleMilestone(formData);
}
