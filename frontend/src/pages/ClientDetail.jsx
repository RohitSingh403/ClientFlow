import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { Pill } from '../components/ui.jsx';
import { errorMessage, formatDay, statusLabel, statusTone } from '../format.js';

export default function ClientDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/clients/${id}`).then((response) => setData(response.data)).catch((err) => setError(errorMessage(err)));
  }, [id]);

  if (error) return <p className="text-sm text-wine">{error}</p>;
  if (!data) return <p className="text-sm text-ink-soft">Loading client…</p>;

  return (
    <div>
      <Link className="text-sm text-ink-soft" to="/app/clients">Clients</Link>
      <h1 className="mt-2 font-serif text-5xl">{data.client.company}</h1>
      <p className="mt-2 text-sm text-ink-soft">{data.client.name} · {data.client.email}{data.client.phone ? ` · ${data.client.phone}` : ''}</p>
      <div className="mt-8 grid gap-3">
        {data.projects.map((project) => (
          <Link key={project.id} className="flex items-center justify-between rounded-3xl border border-line bg-card px-5 py-4" to={`/app/projects/${project.id}`}>
            <span>
              <span className="block font-medium">{project.name}</span>
              <span className="text-sm text-ink-soft">Due {formatDay(project.dueDate)}</span>
            </span>
            <Pill tone={statusTone(project.status)}>{statusLabel(project.status)}</Pill>
          </Link>
        ))}
        {!data.projects.length ? <p className="text-sm text-ink-soft">No projects for this client yet.</p> : null}
      </div>
    </div>
  );
}
