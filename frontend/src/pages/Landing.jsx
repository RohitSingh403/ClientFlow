import { Link } from 'react-router-dom';

const STEPS = [
  ['Studio', 'Create the organization and invite the people who do the work.'],
  ['Client', 'Give the client one login, instead of another shared folder.'],
  ['Project', 'Track milestones and tasks without leaving the account.'],
  ['Deliverable', 'Upload a version. The client approves it or sends it back.'],
  ['Invoice', 'Bill the work, watch it go overdue, and record the payment.'],
];

const PLANS = [
  ['Projects', '2', '20', 'Unlimited'],
  ['Clients', '5', '50', 'Unlimited'],
  ['Team members', '2', '10', '50'],
  ['Storage', '500 MB', '10 GB', '100 GB'],
  ['Invoices', 'Yes', 'Yes', 'Yes'],
  ['Analytics', '—', 'Yes', 'Yes'],
  ['Custom branding', '—', '—', 'Yes'],
];

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-6">
      <header className="flex items-center justify-between">
        <p className="font-serif text-3xl">ClientFlow</p>
        <div className="flex gap-2">
          <Link className="rounded-full px-4 py-2 text-sm font-semibold" to="/login">Sign in</Link>
          <Link className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-paper" to="/register">Open a studio</Link>
        </div>
      </header>

      <section className="grid items-end gap-10 py-16 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-copper">For studios and freelancers</p>
          <h1 className="mt-3 max-w-xl font-serif text-6xl leading-[0.95] sm:text-7xl">
            The agency and the client, in one workspace.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-ink-soft">
            Projects, versioned deliverables, approvals, and invoices. One organization boundary, so another studio never sees your work.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="rounded-full bg-copper px-5 py-3 text-sm font-semibold text-white" to="/register">Start on the free plan</Link>
            <Link className="rounded-full border border-line bg-card px-5 py-3 text-sm font-semibold" to="/login">View the Northline demo</Link>
          </div>
        </div>
        <div className="rounded-[28px] border border-line bg-card p-5 shadow-[0_20px_60px_rgba(23,32,51,0.06)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-soft">Homepage Design</p>
              <p className="font-serif text-3xl">Version 2</p>
            </div>
            <span className="rounded-full bg-[#f8e6da] px-3 py-1 text-xs font-semibold text-copper-dark">Pending review</span>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl bg-navy">
            <div className="h-36 bg-[linear-gradient(160deg,#172033,#3c4c63)] p-5 text-paper">
              <p className="text-xs text-paper/60">ABC Pvt Ltd</p>
              <p className="mt-6 font-serif text-3xl">A calmer homepage</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-full bg-sage py-2 text-center text-sm font-semibold text-white">Approve</div>
            <div className="rounded-full border border-line py-2 text-center text-sm font-semibold">Request changes</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 border-t border-line py-12 md:grid-cols-5">
        {STEPS.map(([title, body], index) => (
          <article key={title}>
            <p className="font-serif text-2xl text-copper">0{index + 1}</p>
            <h2 className="mt-2 font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-ink-soft">{body}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[28px] border border-line bg-card p-6">
        <h2 className="font-serif text-4xl">Plans that enforce themselves</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Free, Pro at ₹499 a month, and Business at ₹1,499. The API rejects the next project when the quota is full. Billing here is a sandbox switch, so you can demo the limits without a card.
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-ink-soft">
                <th className="py-3 font-medium">Feature</th>
                <th className="py-3 font-medium">Free</th>
                <th className="py-3 font-medium">Pro</th>
                <th className="py-3 font-medium">Business</th>
              </tr>
            </thead>
            <tbody>
              {PLANS.map((row) => (
                <tr key={row[0]} className="border-b border-line/80">
                  {row.map((cell) => (
                    <td key={cell} className="py-3">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <footer className="py-10 text-sm text-ink-soft">ClientFlow · multi-tenant studio workspace</footer>
    </div>
  );
}
