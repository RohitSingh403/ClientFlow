import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { BarChart, MeterList } from '../components/Charts.jsx';
import { Pill } from '../components/ui.jsx';
import { activitySentence, errorMessage, formatDay, formatWhen, inr, statusLabel, statusTone } from '../format.js';

export default function DashboardPage() {
  const { organization, membership } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/overview').then((response) => setData(response.data)).catch((err) => setError(errorMessage(err)));
  }, [organization?.id]);

  if (error) return <p className="text-sm text-wine">{error}</p>;
  if (!data) return <p className="text-sm text-ink-soft">Loading the studio…</p>;

  const cards = data.cards
    ? [
        ['Active projects', data.cards.activeProjects],
        ['Pending approvals', data.cards.pendingApprovals],
        ['Outstanding', inr(data.cards.outstandingInvoices)],
        ['Revenue', inr(data.cards.revenue)],
        ['Completed', data.cards.completedProjects],
        ['Overdue tasks', data.cards.overdueTasks],
      ]
    : [];

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-copper">{organization?.planLabel} plan</p>
      <h1 className="font-serif text-5xl">{membership?.role === 'CLIENT' ? 'Your projects' : organization?.name}</h1>
      <p className="mt-2 text-sm text-ink-soft">Signed in as {membership?.role.toLowerCase()}.</p>

      {cards.length ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map(([label, value]) => (
            <article key={label} className="rounded-3xl border border-line bg-card px-5 py-4">
              <p className="text-sm text-ink-soft">{label}</p>
              <p className="mt-2 font-serif text-4xl">{value}</p>
            </article>
          ))}
        </div>
      ) : null}

      {!data.charts && data.cards ? (
        <p className="mt-4 rounded-2xl bg-muted px-4 py-3 text-sm text-ink-soft">
          Charts are on the Pro plan. Operational counts stay available on Free.
        </p>
      ) : null}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-line bg-card p-5">
          <h2 className="font-serif text-3xl">Waiting on review</h2>
          <div className="mt-4 space-y-3">
            {data.pendingApprovals.length ? data.pendingApprovals.map((item) => (
              <Link key={item.deliverableId} className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3" to={`/app/projects/${item.projectId}`}>
                <span>
                  <span className="block font-medium">{item.title}</span>
                  <span className="text-sm text-ink-soft">{item.projectName}</span>
                </span>
                <Pill tone={statusTone(item.status)}>{statusLabel(item.status)}</Pill>
              </Link>
            )) : <p className="text-sm text-ink-soft">No deliverable is waiting.</p>}
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-card p-5">
          <h2 className="font-serif text-3xl">{membership?.role === 'CLIENT' ? 'Open invoices' : 'Your open tasks'}</h2>
          <div className="mt-4 space-y-3">
            {membership?.role === 'CLIENT'
              ? data.openInvoices.map((invoice) => (
                  <Link key={invoice.id} className="flex items-center justify-between rounded-2xl border border-line px-4 py-3" to={`/app/invoices/${invoice.id}`}>
                    <span>Invoice #{invoice.number}</span>
                    <span className="text-sm">{inr(invoice.total)} · {statusLabel(invoice.status)}</span>
                  </Link>
                ))
              : data.myTasks.map((task) => (
                  <Link key={task.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3" to={`/app/projects/${task.projectId}`}>
                    <span>
                      <span className="block font-medium">{task.title}</span>
                      <span className="text-sm text-ink-soft">{task.projectName} · due {formatDay(task.dueDate)}</span>
                    </span>
                    <Pill tone={statusTone(task.status)}>{statusLabel(task.status)}</Pill>
                  </Link>
                ))}
            {membership?.role === 'CLIENT' && !data.openInvoices.length ? <p className="text-sm text-ink-soft">No open invoices.</p> : null}
            {membership?.role !== 'CLIENT' && !data.myTasks.length ? <p className="text-sm text-ink-soft">Nothing is assigned to you.</p> : null}
          </div>
        </section>
      </div>

      {data.charts ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <section className="rounded-3xl border border-line bg-card p-5">
            <h2 className="mb-4 font-serif text-3xl">Revenue</h2>
            <BarChart rows={data.charts.revenueByMonth} />
          </section>
          <section className="rounded-3xl border border-line bg-card p-5">
            <h2 className="mb-4 font-serif text-3xl">Projects by status</h2>
            <MeterList rows={data.charts.projectsByStatus} labelFor={statusLabel} />
          </section>
          <section className="rounded-3xl border border-line bg-card p-5">
            <h2 className="mb-4 font-serif text-3xl">Tasks</h2>
            <MeterList rows={data.charts.tasksByStatus} labelFor={statusLabel} />
          </section>
          <section className="rounded-3xl border border-line bg-card p-5">
            <h2 className="mb-4 font-serif text-3xl">Invoices</h2>
            <MeterList rows={data.charts.invoicesByStatus} labelFor={statusLabel} />
          </section>
        </div>
      ) : null}

      <section className="mt-4 rounded-3xl border border-line bg-card p-5">
        <h2 className="font-serif text-3xl">Recent activity</h2>
        <ul className="mt-4 space-y-3">
          {data.recentActivity.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line/80 pb-3 text-sm last:border-0">
              <span>{activitySentence(entry)}</span>
              <span className="text-ink-soft">{formatWhen(entry.createdAt)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
