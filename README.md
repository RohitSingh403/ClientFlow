# ClientFlow

ClientFlow is a multi-tenant workspace for a studio and its clients. The agency keeps projects, deliverables, approvals, and invoices in one place. A client signs in and reviews the work that belongs to them.

You can use it for a real small studio, and you can walk the seeded Northline Studio when you want to show the product. `npm run db:reset` wipes the local database and restores that demo. Do not run it if you want to keep organizations you created yourself.

There is no hosted demo. Run it locally.

## Stack

| Layer | What it uses |
| --- | --- |
| App | Next.js App Router, React, Tailwind |
| Data | SQLite through Prisma, so a clone runs without a database server |
| Auth | Password hash with bcrypt, session in an httpOnly cookie signed with jose |
| Files | Local `storage/` directory behind an authenticated route |
| Jobs | A worker function. The request that creates an invoice does not send email |

SQLite is the local default. The schema uses plain strings and integer money (paise) so the same models can move to Postgres. Uploaded files sit on disk for development. A host with an ephemeral disk, including Render, should replace `src/server/storage.ts` with object storage.

## Roles

Public registration creates an owner and a new organization on the Free plan. It does not let someone pick another role. Staff and client portal accounts are created from inside a workspace.

| Role | What they can do |
| --- | --- |
| Owner | Everything in the workspace, including plan changes. Cannot approve a deliverable |
| Admin | Run the workspace and the reminder job. Cannot change the plan |
| Manager | Clients, projects, tasks, deliverables, and invoices. Cannot run jobs or change the plan |
| Employee | View projects, move tasks, upload deliverable versions, comment |
| Client | View their own projects, approve or request changes, comment, view their invoices |

Permissions are `resource:action`, for example `project:create`, `deliverable:approve`, `invoice:collect`. Owner is the only role with `*`. Admin does not pass a check for `billing:manage`.

## Tenancy

A session points at one membership. Every request reloads that membership, so a removed person loses access on the next request.

Project queries go through `projectWhere`:

- The organization id comes from the membership, not from the form.
- A client membership also requires the client id stored on that membership.
- A client with no client id matches nothing.

Knowing another organization's project id returns 404. `npm run check:tenant` reads the seeded database and checks that Northline cannot load a Harbor project, and that ABC's client cannot see Kite & Co.

Invoice lines do not accept a client id from the browser. The server loads the project inside the caller's organization and bills that project's client. Totals are computed on the server.

## Deliverable versions

A deliverable starts at v1 with status `PENDING`.

- `PENDING` can become `APPROVED` or `CHANGES_REQUESTED`
- `CHANGES_REQUESTED` cannot become `APPROVED`
- The next file is a new version, and only after changes were requested
- Only the latest version can be reviewed

Logo Design in the seed is v1 changes requested, v2 changes requested, v3 approved. Homepage Design v2 is waiting on Priya.

## Invoices

Money is stored in paise. The seeded invoice INV-1024 is Website Development ₹50,000 plus SEO ₹20,000, GST 18%, total ₹82,600. That arithmetic is covered by `npm test`.

States:

- Draft → Sent or Cancelled
- Sent → Viewed, Paid, Overdue, or Cancelled
- Viewed → Paid, Overdue, or Cancelled
- Overdue → Paid or Cancelled
- Paid and Cancelled stop

A client opening a sent invoice moves it to Viewed. The agency opening it does not.

## Plans and limits

| Feature | Free | Pro | Business |
| --- | --- | --- | --- |
| Projects | 2 | 20 | Unlimited |
| Clients | 5 | 50 | Unlimited |
| Team members | 2 | 10 | 50 |
| Storage | 500 MB | 10 GB | 100 GB |
| Invoices | Yes | Yes | Yes |
| Analytics | No | Yes | Yes |
| Custom branding | No | No | Yes |

Creating a record checks `used < limit`. Harbor & Co is on Free with 2 projects, so a third project is refused, and the existing two are still allowed. A downgrade is refused when current usage does not fit the smaller plan.

Analytics charts render only when the role may view them and the plan includes them. A brand color is stored only when Business is active; it is not applied on a lower plan.

Plan changes are recorded on the organization. Nothing here charges a card. A payment provider would call the same plan change after a successful payment.

## Worker

Creating work writes an in-app notification immediately and, when an email is needed, a row in the outbox with status `PENDING`. Nothing in that request sends mail.

`runWorker` does two things for one organization, or for every organization when the cron route calls it:

1. Sent or viewed invoices past their due date become overdue. The actor on that activity row is empty, so the log shows ClientFlow rather than a person.
2. Pending outbox rows for that organization are marked sent.

Northline's settings page shows that organization's job log and outbox only. INV-1024 is sent and already past due, so the first run of the reminder job is the thing that marks it overdue. There is also one unsent assignment email waiting in the outbox.

The button runs the worker for the signed-in organization. A scheduler can POST `/api/jobs/overdue` with `Authorization: Bearer $CRON_SECRET`.

## Activity

Each entry stores actor, action, resource, resource id, timestamp, optional metadata, and a sentence for the screen. System events, such as an invoice becoming overdue, have no actor.

## How to run it locally

Use Node.js 20 or newer. Do not commit `.env`.

```bash
cp .env.example .env
npm install
npm run setup
npm run dev
```

`npm run setup` creates the SQLite file and loads the demo.

```bash
npm test
npm run check:tenant
```

Open http://localhost:3000 and sign in.

| Email | Workspace | Role |
| --- | --- | --- |
| rohit@northline.studio | Northline Studio | Owner |
| rahul@northline.studio | Northline Studio | Manager |
| meera@northline.studio | Northline Studio | Employee |
| priya@abcpvt.com | Northline Studio | Client for ABC Pvt Ltd |
| anika@harbor.co | Harbor & Co | Owner, on the free project limit |

Password for every seeded account: `clientflow`

Registering from the home page creates a separate organization. It does not join Northline.

## What is intentionally local

- Email is an outbox the worker marks sent. Swap the outbox update for a real mailer later.
- Files are on local disk.
- Plans are enforced, not billed.
