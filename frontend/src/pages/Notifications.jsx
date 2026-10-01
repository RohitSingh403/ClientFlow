import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { PageHeader } from '../components/ui.jsx';
import { errorMessage, formatWhen } from '../format.js';

export default function NotificationsPage() {
  const { organization } = useAuth();
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    api.get('/notifications').then(async (response) => {
      setNotes(response.data.notifications);
      await api.post('/notifications/read-all');
    }).catch((err) => setNotes([{ id: 'err', title: errorMessage(err), body: '', createdAt: null, link: '' }]));
  }, [organization?.id]);

  return (
    <div>
      <PageHeader eyebrow="Inbox" title="Notifications" body="Approvals, assignments, and overdue invoices land here. The server checks due invoices about once a minute." />
      <div className="space-y-3">
        {notes.map((note) => {
          const content = (
            <article className="rounded-2xl border border-line bg-card px-4 py-3">
              <p className="font-medium">{note.title}</p>
              {note.body ? <p className="text-sm text-ink-soft">{note.body}</p> : null}
              {note.createdAt ? <p className="mt-1 text-xs text-ink-soft">{formatWhen(note.createdAt)}</p> : null}
            </article>
          );
          return note.link ? <Link key={note.id} to={note.link}>{content}</Link> : <div key={note.id}>{content}</div>;
        })}
        {!notes.length ? <p className="text-sm text-ink-soft">You are caught up.</p> : null}
      </div>
    </div>
  );
}
