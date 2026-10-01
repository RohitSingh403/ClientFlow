import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Banner, Button, Field, PageHeader, Pill, controlClass } from '../components/ui.jsx';
import { errorMessage } from '../format.js';

const blank = { name: '', email: '', password: '', role: 'EMPLOYEE', clientId: '' };

export default function TeamPage() {
  const { can, organization } = useAuth();
  const [members, setMembers] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function load() {
    api.get('/members').then((response) => setMembers(response.data.members)).catch((err) => setError(errorMessage(err)));
  }

  useEffect(() => {
    load();
    if (can('client:view')) api.get('/clients').then((response) => setClients(response.data.clients)).catch(() => {});
  }, [organization?.id]);

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      await api.post('/members', {
        ...form,
        clientId: form.role === 'CLIENT' ? form.clientId : undefined,
      });
      setForm(blank);
      setNotice('They can sign in with that email and password.');
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader eyebrow="People" title="Team" body="Owners manage billing. Managers run the work. Employees update tasks on projects they belong to. Clients only see their company." />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-2">
          {members.map((member) => (
            <article key={member.id} className="flex items-center justify-between rounded-2xl border border-line bg-card px-4 py-3">
              <div>
                <p className="font-medium">{member.user?.name}</p>
                <p className="text-sm text-ink-soft">{member.user?.email}{member.clientCompany ? ` · ${member.clientCompany}` : ''}</p>
              </div>
              <Pill>{member.role}</Pill>
            </article>
          ))}
        </div>
        {can('member:invite') ? (
          <form className="space-y-3 rounded-3xl border border-line bg-card p-4" onSubmit={onSubmit}>
            <h2 className="font-serif text-3xl">Invite</h2>
            {error ? <Banner>{error}</Banner> : null}
            {notice ? <Banner tone="sage">{notice}</Banner> : null}
            <Field label="Name"><input className={controlClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
            <Field label="Email"><input className={controlClass} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></Field>
            <Field label="Password"><input className={controlClass} type="text" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></Field>
            <Field label="Role">
              <select className={controlClass} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
                {['ADMIN', 'MANAGER', 'EMPLOYEE', 'CLIENT'].map((role) => <option key={role}>{role}</option>)}
              </select>
            </Field>
            {form.role === 'CLIENT' ? (
              <Field label="Linked client">
                <select className={controlClass} value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })} required>
                  <option value="">Choose</option>
                  {clients.map((client) => <option key={client.id} value={client.id}>{client.company}</option>)}
                </select>
              </Field>
            ) : null}
            <Button type="submit">Add to studio</Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
