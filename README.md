# ClientFlow

ClientFlow is a multi-tenant workspace for a studio and its clients. The agency keeps projects, deliverables, approvals, and invoices in one place. A client signs in and reviews the work that belongs to them.

You can use it for a real small studio, and you can walk the seeded Northline Studio when you want to show the product. `npm run db:reset` wipes the local database and restores that demo. Do not run it if you want to keep organizations you created yourself.

There is no hosted demo. Run it locally.

## Where it stands

`npm run dev` starts the Next.js app in this repository, at http://localhost:3000.

What is built:

- A marketing page and the signed-in workspace: overview, projects, deliverables, approvals, clients, invoices, activity, team, plan and usage, and inbox.
- Organizations, five roles, and a tenant check. The seed loads Northline Studio (Pro) and Harbor & Co (Free, already at the two-project limit).
- Deliverable versions and invoice states. INV-1024 is Website Development ₹50,000 plus SEO ₹20,000, GST 18%, total ₹82,600.
- Plan limits on projects, clients, seats, storage, analytics, and brand color. Changing a plan writes the new plan. It does not charge a card.
- In-app notifications. Mail is an outbox row. The worker marks those rows sent and does not send them.
- Sessions in an httpOnly `cf_session` cookie. A cookie that does not verify is deleted, so sign-in and the dashboard do not redirect to each other.

What a public demo still needs:

- A mailer in place of the outbox update.
- A scheduler that POSTs `/api/jobs/overdue` with `Authorization: Bearer $CRON_SECRET`.
- A payment provider in front of the same plan change the settings page already records.

Walking the demo changes the database. Priya can approve Homepage Design v2, and the reminder job can mark INV-1024 overdue. `npm run db:reset` puts the seed back, including Homepage Design v2 still waiting on Priya.

## Stack

| Layer | What it uses |
| --- | --- |
| App | Next.js App Router, React, Tailwind |
| Data | Postgres through Prisma |
| Auth | Password hash with bcrypt, session in an httpOnly cookie signed with jose |
| Files | S3-compatible storage when `S3_BUCKET` is set, otherwise a local `storage/` directory |
| Jobs | A worker function. The request that creates an invoice does not send email |

`DATABASE_URL` is a Postgres connection string. On your laptop, use the external URL from the database host. On Render, use the internal URL. Uploads stay on local disk until `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `S3_ENDPOINT` are set. Those four send files to S3-compatible storage, including Cloudflare R2.

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

`npm run setup` creates the tables in Postgres and loads the demo when the database is empty.

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

These are the same gaps listed above. They are left local on purpose until there is a host.

- Email is an outbox the worker marks sent. Swap the outbox update for a real mailer later.
- Files are on local disk.
- Plans are enforced, not billed.
- The overdue job runs from the settings button, or from a bearer request. Nothing calls it on a clock.
