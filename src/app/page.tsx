import Link from "next/link";
import { Mark } from "@/components/mark";
import { PLANS } from "@/lib/entitlements";

const STEPS = [
  ["01", "Create the organization"],
  ["02", "Add the client"],
  ["03", "Open a project"],
  ["04", "Upload a deliverable"],
  ["05", "Client approves or asks for changes"],
  ["06", "Send the invoice"],
];

const FEATURES = [
  {
    title: "A wall between agencies",
    body: "Every project, file, and invoice belongs to one organization. Knowing another agency’s id still returns nothing.",
  },
  {
    title: "Approval is a state machine",
    body: "The client approves the latest version or requests changes. The next file is a new version. An approved version does not jump backward.",
  },
  {
    title: "The plan is enforced",
    body: "Free, Pro, and Business set real limits on projects, clients, seats, and storage. The check runs before the record is created.",
  },
];

export default function HomePage() {
  const plans = Object.values(PLANS);
  return (
    <div className="min-h-screen">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Mark />
          <nav className="flex items-center gap-2" aria-label="Account">
            <Link href="/login" className="btn btn-ghost">
              Sign in
            </Link>
            <Link href="/register" className="btn btn-primary">
              Create workspace
            </Link>
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-5 pb-20">
        <section className="grid items-center gap-10 py-12 md:grid-cols-[1.15fr_0.85fr] md:py-16">
          <div className="rise">
            <p className="eyebrow">For studios and small agencies</p>
            <h1 className="mt-3 max-w-3xl font-serif text-5xl leading-[1.02] tracking-tight md:text-6xl">
              One workspace for the work you do for clients.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              Projects, versions, approvals, and invoices stay with the agency and the client. The thread does not live across chat, email, a drive, and a spreadsheet.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <Link href="/register" className="btn btn-primary">
                Start on the free plan
              </Link>
              <Link href="/login" className="btn btn-pine">
                Open the demo studio
              </Link>
            </div>
          </div>
          <aside className="hero-panel rise delay-2 card" aria-label="Sample of the workspace">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[#c9d7d1]">Northline Studio</p>
                <p className="mt-1 font-serif text-3xl">Invoice INV-1024</p>
              </div>
              <span className="pill" data-tone="warn">
                Sent
              </span>
            </div>
            <dl className="mt-6 grid gap-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
                <dt className="text-[#c9d7d1]">Website Development</dt>
                <dd className="num">₹50,000</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
                <dt className="text-[#c9d7d1]">SEO</dt>
                <dd className="num">₹20,000</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Total with GST</dt>
                <dd className="num font-serif text-2xl">₹82,600</dd>
              </div>
            </dl>
            <div className="mt-6 rounded-2xl bg-white/10 px-3 py-3">
              <p className="text-xs text-[#c9d7d1]">Waiting on the client</p>
              <p className="mt-1 font-medium">Homepage Design · v2</p>
            </div>
            <p className="mt-4 text-xs text-[#9fb2aa]">Demo password for every account: clientflow</p>
          </aside>
        </section>

        <section aria-labelledby="flow-title">
          <h2 id="flow-title" className="font-serif text-3xl">
            The work has one path
          </h2>
          <ol className="mt-4 grid gap-3 md:grid-cols-3">
            {STEPS.map(([index, step], order) => (
              <li key={step} className={`card rise delay-${Math.min(order, 3)}`}>
                <p className="num text-sm text-copper">{index}</p>
                <p className="mt-2">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14 grid gap-4 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="card">
              <h2 className="font-serif text-2xl">{feature.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{feature.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-16" aria-labelledby="plans-title">
          <h2 id="plans-title" className="font-serif text-3xl">
            Plans
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Changing the plan is refused when current usage does not fit. A payment provider would sit in front of the same check.
          </p>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {plans.map((plan) => (
              <article key={plan.label} className="price-card card" data-featured={plan.label === "Pro" ? "true" : "false"}>
                <p className="eyebrow">{plan.label === "Pro" ? "Most studios" : "Plan"}</p>
                <h3 className="mt-1 font-serif text-3xl">{plan.label}</h3>
                <p className="mt-1 text-muted">{plan.price}</p>
                <ul className="mt-4 grid gap-1.5 text-sm">
                  <li>{plan.label === "Business" ? "Unlimited" : plan.projects} projects</li>
                  <li>{plan.label === "Business" ? "Unlimited" : plan.clients} clients</li>
                  <li>{plan.members} team members</li>
                  <li>{plan.storageLabel} storage</li>
                  <li>{plan.analytics ? "Analytics included" : "Operational counts only"}</li>
                  <li>{plan.branding ? "Custom brand color" : "Standard brand"}</li>
                </ul>
                <Link href="/register" className={`btn mt-5 ${plan.label === "Pro" ? "btn-primary" : "btn-ghost"}`}>
                  Start on {plan.label}
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-muted">
          <p>ClientFlow · one record of the work.</p>
          <Link href="/login" className="underline-offset-4 hover:underline">
            Sign in to Northline Studio
          </Link>
        </div>
      </footer>
    </div>
  );
}
