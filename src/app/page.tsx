import Link from "next/link";
import { PLANS } from "@/lib/entitlements";

const STEPS = [
  "Create the organization",
  "Add the client",
  "Open a project",
  "Upload a deliverable",
  "Client approves or asks for changes",
  "Send the invoice",
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <p className="font-serif text-2xl">ClientFlow</p>
        <div className="flex gap-2">
          <Link href="/login" className="btn btn-ghost">
            Sign in
          </Link>
          <Link href="/register" className="btn btn-primary">
            Create workspace
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-20">
        <section className="grid items-end gap-8 py-10 md:grid-cols-[1.3fr_0.7fr]">
          <div>
            <p className="eyebrow">For studios and small agencies</p>
            <h1 className="mt-3 max-w-3xl font-serif text-5xl leading-[1.05] md:text-6xl">
              One workspace for the work you do for clients.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Projects, versions, approvals, and invoices stay with the agency and the client. The thread does not
              live across chat, email, a drive, and a spreadsheet.
            </p>
            <div className="mt-6 flex gap-2">
              <Link href="/register" className="btn btn-primary">
                Start on the free plan
              </Link>
              <Link href="/login" className="btn btn-pine">
                Open the demo studio
              </Link>
            </div>
          </div>
          <aside className="card bg-pine text-cream">
            <p className="eyebrow text-[#c9d7d1]">Seeded demo</p>
            <p className="mt-2 font-serif text-2xl">Northline Studio</p>
            <p className="mt-2 text-sm text-[#d5e2dc]">Password for every demo account: clientflow</p>
            <dl className="mt-4 grid gap-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt>Owner</dt>
                <dd>rohit@northline.studio</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Client</dt>
                <dd>priya@abcpvt.com</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Other agency</dt>
                <dd>anika@harbor.co</dd>
              </div>
            </dl>
          </aside>
        </section>

        <section className="grid gap-3 md:grid-cols-6">
          {STEPS.map((step, index) => (
            <article key={step} className="card">
              <p className="num text-sm text-copper">{index + 1}</p>
              <p className="mt-2 text-sm">{step}</p>
            </article>
          ))}
        </section>

        <section className="mt-14 grid gap-4 md:grid-cols-3">
          <article className="card">
            <h2 className="font-serif text-2xl">A wall between agencies</h2>
            <p className="mt-2 text-sm text-muted">
              Every project, file, and invoice belongs to one organization. A user from another agency cannot read it,
              even if they know the id.
            </p>
          </article>
          <article className="card">
            <h2 className="font-serif text-2xl">Approval is a state machine</h2>
            <p className="mt-2 text-sm text-muted">
              A client can approve the latest version or request changes. The next file is a new version. An approved
              version does not jump backward.
            </p>
          </article>
          <article className="card">
            <h2 className="font-serif text-2xl">The plan is enforced</h2>
            <p className="mt-2 text-sm text-muted">
              Free, Pro, and Business set real limits on projects, clients, seats, and storage. The check runs before
              the record is created.
            </p>
          </article>
        </section>

        <section className="mt-14">
          <h2 className="font-serif text-3xl">Plans</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="py-3 pr-4 font-medium">Feature</th>
                  {Object.values(PLANS).map((plan) => (
                    <th key={plan.label} className="py-3 pr-4 font-medium">
                      {plan.label}
                      <span className="mt-1 block font-normal text-muted">{plan.price}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <PlanRow label="Projects" values={["2", "20", "Unlimited"]} />
                <PlanRow label="Clients" values={["5", "50", "Unlimited"]} />
                <PlanRow label="Team members" values={["2", "10", "50"]} />
                <PlanRow label="Storage" values={["500 MB", "10 GB", "100 GB"]} />
                <PlanRow label="Invoices" values={["Yes", "Yes", "Yes"]} />
                <PlanRow label="Analytics" values={["—", "Yes", "Yes"]} />
                <PlanRow label="Custom branding" values={["—", "—", "Yes"]} />
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted">
            Plan changes are recorded on the organization. A payment provider would sit in front of the same check.
          </p>
        </section>
      </main>
    </div>
  );
}

function PlanRow({ label, values }: { label: string; values: string[] }) {
  return (
    <tr className="border-b border-line">
      <td className="py-3 pr-4">{label}</td>
      {values.map((value, index) => (
        <td key={`${label}-${index}`} className="py-3 pr-4">
          {value}
        </td>
      ))}
    </tr>
  );
}
