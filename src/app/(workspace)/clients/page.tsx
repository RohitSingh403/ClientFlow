import Link from "next/link";
import { CreateClientForm, PortalForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { requireUser } from "@/server/guard";

export const metadata = { title: "Clients" };

export default async function ClientsPage() {
  const ctx = await requireUser();
  if (!can(ctx.role, "client:view")) return null;
  const clients = await db.client.findMany({
    where: { organizationId: ctx.organizationId },
    include: {
      memberships: { where: { role: "CLIENT" }, include: { user: true } },
      _count: { select: { projects: true } },
    },
    orderBy: { company: "asc" },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
      <div>
        <PageHeader eyebrow="Directory" title="Clients" />
        <div className="grid gap-3">
          {clients.length === 0 ? <p className="text-muted">No clients yet.</p> : null}
          {clients.map((client) => (
            <article key={client.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-serif text-2xl">{client.company}</h2>
                  <p className="text-sm text-muted">
                    {client.contactName} · {client.email}
                    {client.phone ? ` · ${client.phone}` : ""}
                  </p>
                </div>
                <p className="text-sm">{client._count.projects} projects</p>
              </div>
              <p className="mt-3 text-sm">
                Portal: {client.memberships[0] ? client.memberships[0].user.email : "not invited"}
              </p>
              <Link href={`/projects?client=${client.id}`} className="mt-3 inline-block text-sm text-copper">
                View projects
              </Link>
            </article>
          ))}
        </div>
      </div>
      <div className="grid content-start gap-4">
        {can(ctx.role, "client:create") ? <CreateClientForm /> : null}
        {can(ctx.role, "portal:grant") ? (
          <PortalForm clients={clients.map((client) => ({ id: client.id, company: client.company }))} />
        ) : null}
      </div>
    </div>
  );
}
