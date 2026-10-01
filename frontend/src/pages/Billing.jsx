import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Banner, Button, PageHeader } from '../components/ui.jsx';
import { bytesLabel, errorMessage, inr } from '../format.js';

export default function BillingPage() {
  const { can, organization } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [accent, setAccent] = useState(organization?.branding?.accent || '#d4652f');

  function load() {
    api.get('/billing').then((response) => setData(response.data)).catch((err) => setError(errorMessage(err)));
  }

  useEffect(() => {
    load();
  }, [organization?.id]);

  async function changePlan(plan) {
    setError('');
    try {
      await api.post('/billing/plan', { plan });
      window.location.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function saveBranding(event) {
    event.preventDefault();
    setError('');
    try {
      await api.patch('/organization', { branding: { accent } });
      window.location.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (!data && !error) return <p className="text-sm text-ink-soft">Loading plan…</p>;

  return (
    <div>
      <PageHeader
        eyebrow="Subscription"
        title="Plan and limits"
        body="Switching plans is a sandbox. Nothing is charged. The same checks block a real create when you are over quota."
      />
      {error ? <Banner>{error}</Banner> : null}
      {data ? (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {data.plans.map((plan) => {
              const current = plan.id === data.plan;
              return (
                <article key={plan.id} className={`rounded-3xl border p-5 ${current ? 'border-navy bg-navy text-paper' : 'border-line bg-card'}`}>
                  <p className="text-sm opacity-70">{plan.label}</p>
                  <p className="font-serif text-4xl">{plan.priceInr ? `${inr(plan.priceInr)}` : '₹0'}<span className="text-base">/mo</span></p>
                  <ul className="mt-4 space-y-1 text-sm">
                    <li>{plan.projects ?? 'Unlimited'} projects</li>
                    <li>{plan.clients ?? 'Unlimited'} clients</li>
                    <li>{plan.members} team members</li>
                    <li>{bytesLabel(plan.storageBytes)} storage</li>
                    <li>Analytics {plan.analytics ? 'included' : 'not included'}</li>
                    <li>Branding {plan.branding ? 'included' : 'not included'}</li>
                  </ul>
                  {can('billing:manage') ? (
                    <Button className="mt-5" kind={current ? 'line' : 'primary'} disabled={current} onClick={() => changePlan(plan.id)} type="button">
                      {current ? 'Current plan' : `Move to ${plan.label}`}
                    </Button>
                  ) : null}
                </article>
              );
            })}
          </div>
          <section className="mt-6 rounded-3xl border border-line bg-card p-5">
            <h2 className="font-serif text-3xl">Usage</h2>
            <Usage label="Projects" used={data.usage.projects} limit={data.limits.projects} />
            <Usage label="Clients" used={data.usage.clients} limit={data.limits.clients} />
            <Usage label="Team members" used={data.usage.members} limit={data.limits.members} />
            <Usage label="Storage" used={data.usage.storageBytes} limit={data.limits.storageBytes} format={bytesLabel} />
          </section>
          <form className="mt-4 rounded-3xl border border-line bg-card p-5" onSubmit={saveBranding}>
            <h2 className="font-serif text-3xl">Branding</h2>
            <p className="mt-1 text-sm text-ink-soft">Custom accent color is a Business feature. Pro and Free keep the studio copper.</p>
            <div className="mt-3 flex items-center gap-3">
              <input type="color" value={accent} onChange={(event) => setAccent(event.target.value)} disabled={!organization?.features?.branding || !can('organization:update')} />
              <Button type="submit" disabled={!organization?.features?.branding || !can('organization:update')}>Save accent</Button>
            </div>
          </form>
        </>
      ) : null}
    </div>
  );
}

function Usage({ label, used, limit, format = (value) => value }) {
  const width = limit ? Math.min(100, (used / limit) * 100) : 8;
  return (
    <div className="mt-4">
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-ink-soft">{format(used)} / {limit == null ? 'Unlimited' : format(limit)}</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className="h-2 rounded-full bg-copper" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
