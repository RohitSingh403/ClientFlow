import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { PageHeader } from '../components/ui.jsx';
import { activitySentence, errorMessage, formatWhen } from '../format.js';

export default function ActivityPage() {
  const { organization } = useAuth();
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/activity').then((response) => setEntries(response.data.activity)).catch((err) => setError(errorMessage(err)));
  }, [organization?.id]);

  return (
    <div>
      <PageHeader eyebrow="Audit" title="Activity" body="Who did what, on which record, and when. Clients only see events on their own projects." />
      {error ? <p className="text-sm text-wine">{error}</p> : null}
      <ol className="space-y-3">
        {entries.map((entry) => (
          <li key={entry.id} className="grid gap-1 rounded-2xl border border-line bg-card px-4 py-3 sm:grid-cols-[1fr_auto]">
            <span>{activitySentence(entry)}</span>
            <span className="text-sm text-ink-soft">{formatWhen(entry.createdAt)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
