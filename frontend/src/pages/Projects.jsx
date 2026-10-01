import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Banner, Button, Empty, Field, Modal, PageHeader, Pill, controlClass } from '../components/ui.jsx';
import { errorMessage, formatDay, statusLabel, statusTone } from '../format.js';

export default function ProjectsPage() {
  const { can, organization } = useAuth();
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [status, setStatus] = useState('ALL');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', description: '', clientId: '', dueDate: '' });

  function load() {
    api.get('/projects').then((response) => setProjects(response.data.projects)).catch((err) => setError(errorMessage(err)));
  }

  useEffect(() => {
    load();
    if (can('client:view')) {
      api.get('/clients').then((response) => setClients(response.data.clients)).catch(() => {});
    }
  }, [organization?.id]);

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    try {
      await api.post('/projects', {
        name: form.name,
        description: form.description,
        clientId: form.clientId,
        dueDate: form.dueDate || null,
      });
      setOpen(false);
      setForm({ name: '', description: '', clientId: '', dueDate: '' });
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const visible = projects.filter((project) => status === 'ALL' || project.status === status);

  return (
    <div>
      <PageHeader
        eyebrow="Work"
        title="Projects"
        body="A project belongs to one client and one studio. People outside the studio get a not-found, not a peek."
        action={can('project:create') ? <Button onClick={() => setOpen(true)}>New project</Button> : null}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {['ALL', 'PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED'].map((item) => (
          <button key={item} className={`rounded-full px-3 py-1.5 text-sm ${status === item ? 'bg-navy text-paper' : 'bg-card border border-line'}`} onClick={() => setStatus(item)} type="button">
            {item === 'ALL' ? 'All' : statusLabel(item)}
          </button>
        ))}
      </div>
      {error && !open ? <Banner>{error}</Banner> : null}
      {visible.length ? (
        <div className="grid gap-3">
          {visible.map((project) => (
            <Link key={project.id} className="rounded-3xl border border-line bg-card px-5 py-4" to={`/app/projects/${project.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-serif text-3xl">{project.name}</p>
                  <p className="text-sm text-ink-soft">{project.client?.company} · due {formatDay(project.dueDate)}</p>
                </div>
                <Pill tone={statusTone(project.status)}>{statusLabel(project.status)}</Pill>
              </div>
              <p className="mt-3 text-sm text-ink-soft">{project.tasksDone}/{project.taskCount} tasks done · {project.pendingApprovals} waiting on review</p>
            </Link>
          ))}
        </div>
      ) : (
        <Empty title="No projects in this view" body="Create one after you have a client, or clear the status filter." />
      )}
      {open ? (
        <Modal title="New project" onClose={() => setOpen(false)}>
          <form className="space-y-4" onSubmit={onSubmit}>
            {error ? <Banner>{error}</Banner> : null}
            <Field label="Name"><input className={controlClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
            <Field label="Client">
              <select className={controlClass} value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })} required>
                <option value="">Choose</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.company}</option>)}
              </select>
            </Field>
            <Field label="Description"><textarea className={controlClass} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
            <Field label="Due date"><input className={controlClass} type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></Field>
            <Button type="submit">Create project</Button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
