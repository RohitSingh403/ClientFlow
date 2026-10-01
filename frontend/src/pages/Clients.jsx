import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Banner, Button, Empty, Field, Modal, PageHeader, controlClass } from '../components/ui.jsx';
import { errorMessage } from '../format.js';

const blank = { name: '', company: '', email: '', phone: '' };

export default function ClientsPage() {
  const { can, organization } = useAuth();
  const [clients, setClients] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');

  function load() {
    api.get('/clients').then((response) => setClients(response.data.clients)).catch((err) => setError(errorMessage(err)));
  }

  useEffect(() => {
    load();
  }, [organization?.id]);

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    try {
      await api.post('/clients', form);
      setForm(blank);
      setOpen(false);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Accounts"
        title="Clients"
        body="Each client can later get a portal login that sees only their projects."
        action={can('client:create') ? <Button onClick={() => setOpen(true)}>Add client</Button> : null}
      />
      {error && !open ? <Banner>{error}</Banner> : null}
      {clients.length ? (
        <div className="grid gap-3">
          {clients.map((client) => (
            <Link key={client.id} className="rounded-3xl border border-line bg-card px-5 py-4" to={`/app/clients/${client.id}`}>
              <p className="font-serif text-2xl">{client.company}</p>
              <p className="text-sm text-ink-soft">{client.name} · {client.email}</p>
            </Link>
          ))}
        </div>
      ) : (
        <Empty title="No clients yet" body="Add the company you are working with. Projects hang off a client." />
      )}
      {open ? (
        <Modal title="New client" onClose={() => setOpen(false)}>
          <form className="space-y-4" onSubmit={onSubmit}>
            {error ? <Banner>{error}</Banner> : null}
            <Field label="Company"><input className={controlClass} value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} required /></Field>
            <Field label="Contact name"><input className={controlClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
            <Field label="Email"><input className={controlClass} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></Field>
            <Field label="Phone"><input className={controlClass} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
            <Button type="submit">Save client</Button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
