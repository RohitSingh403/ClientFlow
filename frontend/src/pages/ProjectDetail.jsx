import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Banner, Button, Field, Pill, controlClass } from '../components/ui.jsx';
import { errorMessage, formatDay, formatWhen, inr, statusLabel, statusTone } from '../format.js';

const COLUMNS = ['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'];

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { can } = useAuth();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('board');
  const [error, setError] = useState('');
  const [deliverable, setDeliverable] = useState(null);

  function load() {
    api.get(`/projects/${id}`).then((response) => setData(response.data)).catch((err) => setError(errorMessage(err)));
  }

  useEffect(() => {
    load();
    setDeliverable(null);
  }, [id]);

  async function patchProject(payload) {
    setError('');
    try {
      await api.patch(`/projects/${id}`, payload);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (error && !data) return <p className="text-sm text-wine">{error}</p>;
  if (!data) return <p className="text-sm text-ink-soft">Loading project…</p>;

  const project = data.project;

  return (
    <div>
      <Link className="text-sm text-ink-soft" to="/app/projects">Projects</Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink-soft">{project.client.company}</p>
          <h1 className="font-serif text-5xl">{project.name}</h1>
          {project.description ? <p className="mt-2 max-w-2xl text-sm text-ink-soft">{project.description}</p> : null}
        </div>
        {can('project:update') ? (
          <select
            className="rounded-full border border-line bg-card px-3 py-2 text-sm"
            value={project.status}
            onChange={(event) => patchProject({ status: event.target.value })}
          >
            {['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED'].map((status) => (
              <option key={status} value={status}>{statusLabel(status)}</option>
            ))}
          </select>
        ) : (
          <Pill tone={statusTone(project.status)}>{statusLabel(project.status)}</Pill>
        )}
      </div>
      <p className="mt-3 text-sm text-ink-soft">
        Due {formatDay(project.dueDate)} · {project.members.map((member) => member.name).join(', ') || 'No team yet'}
      </p>
      {error ? <div className="mt-4"><Banner>{error}</Banner></div> : null}

      <div className="mt-6 flex gap-2">
        {[
          ['board', 'Board'],
          ['deliverables', 'Deliverables'],
          ['milestones', 'Milestones'],
        ].map(([key, label]) => (
          <button key={key} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === key ? 'bg-navy text-paper' : 'bg-card border border-line'}`} onClick={() => setTab(key)} type="button">
            {label}
          </button>
        ))}
      </div>

      {tab === 'board' ? (
        <Board data={data} can={can} onChange={load} onError={setError} />
      ) : null}
      {tab === 'deliverables' ? (
        <Deliverables
          projectId={project.id}
          summaries={data.deliverables}
          selected={deliverable}
          onSelect={async (itemId) => {
            const response = await api.get(`/deliverables/${itemId}`);
            setDeliverable(response.data.deliverable);
          }}
          onRefresh={async () => {
            load();
            if (deliverable) {
              const response = await api.get(`/deliverables/${deliverable.id}`);
              setDeliverable(response.data.deliverable);
            }
          }}
          can={can}
          onError={setError}
        />
      ) : null}
      {tab === 'milestones' ? <Milestones projectId={project.id} milestones={data.milestones} invoices={data.invoices} can={can} onChange={load} onError={setError} /> : null}
    </div>
  );
}

function Board({ data, can, onChange, onError }) {
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  async function createTask(event) {
    event.preventDefault();
    try {
      await api.post(`/projects/${data.project.id}/tasks`, {
        title,
        assigneeId: assigneeId || null,
      });
      setTitle('');
      onChange();
    } catch (err) {
      onError(errorMessage(err));
    }
  }

  async function move(taskId, status) {
    try {
      await api.patch(`/tasks/${taskId}`, { status });
      onChange();
    } catch (err) {
      onError(errorMessage(err));
    }
  }

  return (
    <div className="mt-5">
      {can('task:create') ? (
        <form className="mb-4 flex flex-wrap gap-2" onSubmit={createTask}>
          <input className={`${controlClass} max-w-sm`} placeholder="New task" value={title} onChange={(event) => setTitle(event.target.value)} required />
          <select className={`${controlClass} max-w-xs`} value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
            <option value="">Unassigned</option>
            {data.project.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
          </select>
          <Button type="submit">Add task</Button>
        </form>
      ) : null}
      <div className="grid gap-3 md:grid-cols-4">
        {COLUMNS.map((column) => (
          <section
            key={column}
            className="min-h-48 rounded-3xl bg-muted/70 p-3"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const taskId = event.dataTransfer.getData('text/plain');
              if (taskId) move(taskId, column);
            }}
          >
            <h2 className="px-1 text-sm font-semibold">{statusLabel(column)}</h2>
            <div className="mt-3 space-y-2">
              {data.tasks.filter((task) => task.status === column).map((task) => (
                <article
                  key={task.id}
                  draggable={can('task:update')}
                  onDragStart={(event) => event.dataTransfer.setData('text/plain', task.id)}
                  className="rounded-2xl border border-line bg-card p-3"
                >
                  <p className="font-medium">{task.title}</p>
                  <p className="mt-1 text-xs text-ink-soft">{task.assignee?.name || 'Unassigned'} · {formatDay(task.dueDate)}</p>
                  {can('task:update') ? (
                    <select className="mt-2 w-full rounded-lg border border-line bg-white px-2 py-1 text-xs" value={task.status} onChange={(event) => move(task.id, event.target.value)}>
                      {COLUMNS.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                    </select>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Deliverables({ projectId, summaries, selected, onSelect, onRefresh, can, onError }) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null);
  const [comment, setComment] = useState('');

  async function uploadFirst(event) {
    event.preventDefault();
    const body = new FormData();
    body.append('title', title);
    body.append('changeDescription', note);
    body.append('file', file);
    try {
      await api.post(`/projects/${projectId}/deliverables`, body);
      setTitle('');
      setNote('');
      setFile(null);
      onRefresh();
    } catch (err) {
      onError(errorMessage(err));
    }
  }

  async function uploadNext(event) {
    event.preventDefault();
    const body = new FormData();
    body.append('changeDescription', note);
    body.append('file', file);
    try {
      await api.post(`/deliverables/${selected.id}/versions`, body);
      setNote('');
      setFile(null);
      onRefresh();
    } catch (err) {
      onError(errorMessage(err));
    }
  }

  async function decide(action) {
    try {
      await api.post(`/deliverables/${selected.id}/decision`, { action, comment });
      setComment('');
      onRefresh();
    } catch (err) {
      onError(errorMessage(err));
    }
  }

  async function addComment(event) {
    event.preventDefault();
    try {
      await api.post(`/deliverables/${selected.id}/comments`, { body: comment });
      setComment('');
      onRefresh();
    } catch (err) {
      onError(errorMessage(err));
    }
  }

  const latest = selected?.versions?.at(-1);

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="space-y-2">
        {summaries.map((item) => (
          <button key={item.id} className="w-full rounded-2xl border border-line bg-card px-4 py-3 text-left" onClick={() => onSelect(item.id)} type="button">
            <span className="block font-medium">{item.title}</span>
            <Pill tone={statusTone(item.status)}>{statusLabel(item.status)}</Pill>
          </button>
        ))}
        {can('deliverable:create') ? (
          <form className="space-y-2 rounded-2xl border border-dashed border-line p-3" onSubmit={uploadFirst}>
            <input className={controlClass} placeholder="Deliverable title" value={title} onChange={(event) => setTitle(event.target.value)} required />
            <input className={controlClass} placeholder="What is in v1?" value={note} onChange={(event) => setNote(event.target.value)} />
            <input type="file" accept="image/*,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} required />
            <Button type="submit">Upload v1</Button>
          </form>
        ) : null}
      </div>
      {selected ? (
        <section className="rounded-3xl border border-line bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-4xl">{selected.title}</h2>
              <p className="text-sm text-ink-soft">Latest status: {statusLabel(selected.status)}</p>
            </div>
          </div>
          {latest?.mimeType?.startsWith('image/') ? (
            <img className="mt-4 max-h-[420px] w-full rounded-2xl border border-line object-contain bg-white" src={latest.url} alt={latest.fileName} />
          ) : latest ? (
            <a className="mt-4 inline-block text-sm font-semibold" href={latest.url}>Download {latest.fileName}</a>
          ) : null}
          {latest ? <p className="mt-3 text-sm">{latest.changeDescription}</p> : null}
          {can('deliverable:approve') && latest?.status === 'PENDING_REVIEW' ? (
            <div className="mt-4 space-y-3">
              <textarea className={controlClass} rows={3} placeholder="Comment, required if you request changes" value={comment} onChange={(event) => setComment(event.target.value)} />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => decide('approve')} type="button">Approve</Button>
                <Button kind="line" onClick={() => decide('request_changes')} type="button">Request changes</Button>
              </div>
            </div>
          ) : null}
          {can('deliverable:comment') && latest?.status !== 'PENDING_REVIEW' ? (
            <form className="mt-4 flex gap-2" onSubmit={addComment}>
              <input className={controlClass} placeholder="Add a comment" value={comment} onChange={(event) => setComment(event.target.value)} />
              <Button type="submit">Comment</Button>
            </form>
          ) : null}
          {can('deliverable:create') && latest && latest.status !== 'PENDING_REVIEW' ? (
            <form className="mt-4 space-y-2 border-t border-line pt-4" onSubmit={uploadNext}>
              <Field label="Next version">
                <input className={controlClass} placeholder="What changed?" value={note} onChange={(event) => setNote(event.target.value)} required />
              </Field>
              <input type="file" accept="image/*,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} required />
              <Button type="submit">Upload next version</Button>
            </form>
          ) : null}
          <ol className="mt-6 space-y-4">
            {[...selected.versions].reverse().map((version) => (
              <li key={version.id} className="border-t border-line pt-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">v{version.version} · {version.fileName}</p>
                  <Pill tone={statusTone(version.status)}>{statusLabel(version.status)}</Pill>
                </div>
                <p className="text-xs text-ink-soft">{version.uploadedBy?.name} · {formatWhen(version.uploadedAt)}</p>
                <p className="mt-1 text-sm">{version.changeDescription}</p>
                {version.comments?.map((item) => (
                  <p key={item.id} className="mt-2 rounded-2xl bg-paper px-3 py-2 text-sm">
                    <span className="font-semibold">{item.author?.name}: </span>{item.body}
                  </p>
                ))}
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <p className="text-sm text-ink-soft">Select a deliverable to review its versions.</p>
      )}
    </div>
  );
}

function Milestones({ projectId, milestones, invoices, can, onChange, onError }) {
  const [title, setTitle] = useState('');

  async function createMilestone(event) {
    event.preventDefault();
    try {
      await api.post(`/projects/${projectId}/milestones`, { title });
      setTitle('');
      onChange();
    } catch (err) {
      onError(errorMessage(err));
    }
  }

  async function setStatus(milestoneId, status) {
    try {
      await api.patch(`/milestones/${milestoneId}`, { status });
      onChange();
    } catch (err) {
      onError(errorMessage(err));
    }
  }

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <section>
        {can('milestone:manage') ? (
          <form className="mb-3 flex gap-2" onSubmit={createMilestone}>
            <input className={controlClass} placeholder="Milestone" value={title} onChange={(event) => setTitle(event.target.value)} required />
            <Button type="submit">Add</Button>
          </form>
        ) : null}
        <div className="space-y-2">
          {milestones.map((milestone) => (
            <article key={milestone.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3">
              <div>
                <p className="font-medium">{milestone.title}</p>
                <p className="text-xs text-ink-soft">Due {formatDay(milestone.dueDate)}</p>
              </div>
              {can('milestone:manage') ? (
                <select className="rounded-lg border border-line bg-white px-2 py-1 text-sm" value={milestone.status} onChange={(event) => setStatus(milestone.id, event.target.value)}>
                  {['PENDING', 'IN_PROGRESS', 'COMPLETED'].map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                </select>
              ) : (
                <Pill tone={statusTone(milestone.status)}>{statusLabel(milestone.status)}</Pill>
              )}
            </article>
          ))}
        </div>
      </section>
      <section className="rounded-3xl border border-line bg-card p-5">
        <h2 className="font-serif text-3xl">Invoices on this project</h2>
        <div className="mt-3 space-y-2">
          {invoices.map((invoice) => (
            <Link key={invoice.id} className="flex items-center justify-between text-sm" to={`/app/invoices/${invoice.id}`}>
              <span>#{invoice.number}</span>
              <span>{inr(invoice.total)} · {statusLabel(invoice.status)}</span>
            </Link>
          ))}
          {!invoices.length ? <p className="text-sm text-ink-soft">No invoice yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
