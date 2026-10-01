import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { formatWhen } from "@/lib/format";
import { requireUser } from "@/server/guard";
import { markAllNotificationsRead, markNotificationRead } from "@/server/notifications";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const ctx = await requireUser();
  const notes = await db.notification.findMany({
    where: { userId: ctx.userId, organizationId: ctx.organizationId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <PageHeader eyebrow="Inbox" title="Notifications">
        <form action={markAllNotificationsRead}>
          <button className="btn btn-ghost" type="submit">
            Mark all read
          </button>
        </form>
      </PageHeader>
      <div className="grid gap-2">
        {notes.length === 0 ? <p className="text-muted">No notifications.</p> : null}
        {notes.map((note) => (
          <article key={note.id} className="card" data-read={note.read ? "true" : "false"}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-medium">{note.title}</h2>
                <p className="mt-1 text-sm text-muted">{note.body}</p>
                <p className="mt-2 text-xs text-muted">{formatWhen(note.createdAt)}</p>
              </div>
              {note.read ? null : (
                <form action={markNotificationRead}>
                  <input type="hidden" name="notificationId" value={note.id} />
                  <button className="btn btn-ghost" type="submit">
                    Read
                  </button>
                </form>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
