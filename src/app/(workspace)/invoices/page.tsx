import Link from "next/link";
import { InvoiceForm } from "@/components/forms";
import { PageHeader, StatusPill } from "@/components/ui";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { formatINR } from "@/lib/money";
import { can } from "@/lib/permissions";
import { projectWhere } from "@/lib/scope";
import { INVOICE_STATUSES, isInvoiceStatus } from "@/lib/workflow";
import { INVOICE_LABEL } from "@/lib/format";
import { requireUser } from "@/server/guard";

export const metadata = { title: "Invoices" };

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const ctx = await requireUser();
  if (!can(ctx.role, "invoice:view")) return null;
  const params = await searchParams;
  const status = params.status && isInvoiceStatus(params.status) ? params.status : undefined;
  const invoices = await db.invoice.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(ctx.role === "CLIENT" ? { clientId: ctx.clientId ?? "__deny__" } : {}),
      ...(status ? { status } : {}),
    },
    include: { client: true, project: true },
    orderBy: { createdAt: "desc" },
  });
  const projects = can(ctx.role, "invoice:create")
    ? await db.project.findMany({
        where: projectWhere(ctx),
        include: { client: true },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
      <div>
        <PageHeader eyebrow="Billing" title="Invoices" />
        <div className="mb-4 flex flex-wrap gap-2">
          <Link href="/invoices" className="pill">
            All
          </Link>
          {INVOICE_STATUSES.map((item) => (
            <Link key={item} href={`/invoices?status=${item}`} className="pill">
              {INVOICE_LABEL[item]}
            </Link>
          ))}
        </div>
        <div className="grid gap-2">
          {invoices.length === 0 ? <p className="text-muted">No invoices in this view.</p> : null}
          {invoices.map((invoice) => (
            <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="card flex items-center justify-between gap-3">
              <span>
                <span className="block font-medium">
                  {invoice.number} · {formatINR(invoice.total)}
                </span>
                <span className="text-sm text-muted">
                  {invoice.client.company} · {invoice.project.name} · due {formatDate(invoice.dueDate)}
                </span>
              </span>
              <StatusPill status={invoice.status} />
            </Link>
          ))}
        </div>
      </div>
      {can(ctx.role, "invoice:create") ? (
        <InvoiceForm projects={projects.map((project) => ({ id: project.id, name: project.name, company: project.client.company }))} />
      ) : null}
    </div>
  );
}
