import { notFound } from "next/navigation";
import { InvoiceActions, InvoiceViewBeacon } from "@/components/forms";
import { StatusPill } from "@/components/ui";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { formatINR } from "@/lib/money";
import { can } from "@/lib/permissions";
import { requireUser } from "@/server/guard";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireUser();
  const invoice = await db.invoice.findFirst({
    where: {
      id,
      organizationId: ctx.organizationId,
      ...(ctx.role === "CLIENT" ? { clientId: ctx.clientId ?? "__deny__" } : {}),
    },
  });
  return { title: invoice?.number ?? "Invoice" };
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireUser();
  const invoice = await db.invoice.findFirst({
    where: {
      id,
      organizationId: ctx.organizationId,
      ...(ctx.role === "CLIENT" ? { clientId: ctx.clientId ?? "__deny__" } : {}),
    },
    include: { client: true, project: true, lines: { orderBy: { position: "asc" } }, organization: true },
  });
  if (!invoice) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      {ctx.role === "CLIENT" && invoice.status === "SENT" ? <InvoiceViewBeacon invoiceId={invoice.id} /> : null}
      <article className="card bg-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-serif text-3xl">{invoice.organization.name}</p>
            <p className="mt-4 text-sm text-muted">Invoice</p>
            <h1 className="font-serif text-4xl">{invoice.number}</h1>
          </div>
          <StatusPill status={invoice.status} />
        </div>
        <div className="mt-6 grid gap-4 text-sm md:grid-cols-2">
          <p>
            <span className="block text-muted">Billed to</span>
            {invoice.client.company}
            <br />
            {invoice.client.contactName}
            <br />
            {invoice.client.email}
          </p>
          <p>
            <span className="block text-muted">Project</span>
            {invoice.project.name}
            <br />
            Due {formatDate(invoice.dueDate)}
          </p>
        </div>
        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th className="py-2 font-medium">Description</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line) => (
              <tr key={line.id} className="border-b border-line">
                <td className="py-3">{line.description}</td>
                <td className="num py-3 text-right">{formatINR(line.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-4 ml-auto grid max-w-xs gap-1 text-sm">
          <Row label="Subtotal" value={formatINR(invoice.subtotal)} />
          <Row label={`GST ${invoice.taxRate}%`} value={formatINR(invoice.tax)} />
          <div className="mt-2 flex justify-between border-t border-line pt-2 font-serif text-2xl">
            <dt>Total</dt>
            <dd className="num">{formatINR(invoice.total)}</dd>
          </div>
        </dl>
      </article>
      <div className="mt-4">
        {can(ctx.role, "invoice:send") || can(ctx.role, "invoice:collect") || can(ctx.role, "invoice:cancel") ? (
          <InvoiceActions invoiceId={invoice.id} status={invoice.status} />
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="num">{value}</dd>
    </div>
  );
}
