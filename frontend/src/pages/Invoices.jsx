import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Banner, Button, Field, Modal, PageHeader, Pill, controlClass } from '../components/ui.jsx';
import { errorMessage, formatDay, inr, statusLabel, statusTone } from '../format.js';

export default function InvoicesPage() {
  const { can, organization } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    projectId: '',
    dueDate: '',
    lines: [
      { description: 'Website Development', amount: 50000 },
      { description: 'SEO', amount: 20000 },
    ],
  });

  function load() {
    api.get('/invoices').then((response) => setInvoices(response.data.invoices)).catch((err) => setError(errorMessage(err)));
  }

  useEffect(() => {
    load();
    if (can('invoice:create')) {
      api.get('/projects').then((response) => setProjects(response.data.projects)).catch(() => {});
    }
  }, [organization?.id]);

  function setLine(index, key, value) {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, [key]: value } : line)),
    }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    try {
      await api.post('/invoices', {
        projectId: form.projectId,
        dueDate: form.dueDate || null,
        lines: form.lines.map((line) => ({ description: line.description, amount: Number(line.amount) })),
      });
      setOpen(false);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Money"
        title="Invoices"
        body="Draft, send, and record payment. GST is calculated on the server."
        action={can('invoice:create') ? <Button onClick={() => setOpen(true)}>New invoice</Button> : null}
      />
      {error && !open ? <Banner>{error}</Banner> : null}
      <div className="overflow-hidden rounded-3xl border border-line bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-ink-soft">
            <tr>
              <th className="px-4 py-3 font-medium">Number</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Due</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="border-t border-line">
                <td className="px-4 py-3"><Link className="font-semibold" to={`/app/invoices/${invoice.id}`}>#{invoice.number}</Link></td>
                <td className="px-4 py-3">{invoice.clientCompany}</td>
                <td className="px-4 py-3"><Pill tone={statusTone(invoice.status)}>{statusLabel(invoice.status)}</Pill></td>
                <td className="px-4 py-3">{formatDay(invoice.dueDate)}</td>
                <td className="px-4 py-3 text-right">{inr(invoice.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!invoices.length ? <p className="px-4 py-8 text-sm text-ink-soft">No invoices yet.</p> : null}
      </div>
      {open ? (
        <Modal title="New invoice" onClose={() => setOpen(false)}>
          <form className="space-y-4" onSubmit={onSubmit}>
            {error ? <Banner>{error}</Banner> : null}
            <Field label="Project">
              <select className={controlClass} value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })} required>
                <option value="">Choose</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </Field>
            {form.lines.map((line, index) => (
              <div key={index} className="grid grid-cols-[1fr_120px] gap-2">
                <input className={controlClass} value={line.description} onChange={(event) => setLine(index, 'description', event.target.value)} required />
                <input className={controlClass} type="number" min="1" value={line.amount} onChange={(event) => setLine(index, 'amount', event.target.value)} required />
              </div>
            ))}
            <button
              className="text-sm font-semibold"
              type="button"
              onClick={() => setForm({ ...form, lines: [...form.lines, { description: '', amount: 1000 }] })}
            >
              Add line
            </button>
            <Field label="Due date"><input className={controlClass} type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></Field>
            <Button type="submit">Save draft</Button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
