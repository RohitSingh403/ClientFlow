import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Banner, Button, Field, Pill, controlClass } from '../components/ui.jsx';
import { errorMessage, formatDay, inr, statusLabel, statusTone } from '../format.js';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const { can, organization, membership } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');
  const [method, setMethod] = useState('Bank transfer');
  const [reference, setReference] = useState('');

  function load() {
    return api.get(`/invoices/${id}`).then((response) => setInvoice(response.data.invoice));
  }

  useEffect(() => {
    load()
      .then(() => {
        if (membership?.role === 'CLIENT') return api.post(`/invoices/${id}/view`);
        return null;
      })
      .then((response) => {
        if (response?.data?.invoice) setInvoice(response.data.invoice);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [id]);

  async function act(path, body) {
    setError('');
    try {
      const response = await api.post(`/invoices/${id}/${path}`, body);
      setInvoice(response.data.invoice);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function downloadPdf() {
    const response = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    window.open(url, '_blank', 'noopener');
  }

  if (error && !invoice) return <p className="text-sm text-wine">{error}</p>;
  if (!invoice) return <p className="text-sm text-ink-soft">Loading invoice…</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <Link className="text-sm text-ink-soft" to="/app/invoices">Invoices</Link>
      {error ? <div className="mt-4"><Banner>{error}</Banner></div> : null}
      <article className="mt-4 rounded-[28px] border border-line bg-card p-6 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-serif text-3xl">{organization?.name}</p>
            <p className="text-sm text-ink-soft">Tax invoice</p>
          </div>
          <div className="text-right">
            <p className="font-serif text-4xl">#{invoice.number}</p>
            <Pill tone={statusTone(invoice.status)}>{statusLabel(invoice.status)}</Pill>
          </div>
        </div>
        <div className="mt-8 grid gap-2 text-sm sm:grid-cols-2">
          <p><span className="text-ink-soft">Client</span><br />{invoice.clientCompany}</p>
          <p><span className="text-ink-soft">Project</span><br />{invoice.projectName}</p>
          <p><span className="text-ink-soft">Due</span><br />{formatDay(invoice.dueDate)}</p>
          {invoice.paidAt ? <p><span className="text-ink-soft">Paid</span><br />{formatDay(invoice.paidAt)} · {invoice.paymentMethod}</p> : null}
        </div>
        <table className="mt-8 w-full text-sm">
          <tbody>
            {invoice.lines.map((line) => (
              <tr key={line.description} className="border-b border-line">
                <td className="py-3">{line.description}</td>
                <td className="py-3 text-right">{inr(line.amount)}</td>
              </tr>
            ))}
            <tr>
              <td className="py-3 text-ink-soft">Subtotal</td>
              <td className="py-3 text-right">{inr(invoice.subtotal)}</td>
            </tr>
            <tr>
              <td className="py-3 text-ink-soft">GST ({invoice.taxRate}%)</td>
              <td className="py-3 text-right">{inr(invoice.tax)}</td>
            </tr>
            <tr>
              <td className="py-3 font-serif text-2xl">Total</td>
              <td className="py-3 text-right font-serif text-2xl">{inr(invoice.total)}</td>
            </tr>
          </tbody>
        </table>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button kind="line" onClick={downloadPdf} type="button">Download PDF</Button>
          {can('invoice:send') && invoice.status === 'DRAFT' ? <Button onClick={() => act('send')} type="button">Send</Button> : null}
          {can('invoice:cancel') && !['PAID', 'CANCELLED'].includes(invoice.status) ? (
            <Button kind="ghost" onClick={() => act('cancel')} type="button">Cancel</Button>
          ) : null}
        </div>
        {can('invoice:pay') && ['SENT', 'VIEWED', 'OVERDUE'].includes(invoice.status) ? (
          <form
            className="mt-6 grid gap-3 border-t border-line pt-6 sm:grid-cols-[1fr_1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              act('pay', { method, reference });
            }}
          >
            <Field label="Method"><input className={controlClass} value={method} onChange={(event) => setMethod(event.target.value)} required /></Field>
            <Field label="Reference"><input className={controlClass} value={reference} onChange={(event) => setReference(event.target.value)} /></Field>
            <div className="sm:pt-7"><Button type="submit">Record payment</Button></div>
          </form>
        ) : null}
      </article>
    </div>
  );
}
