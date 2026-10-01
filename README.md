# ClientFlow

ClientFlow is a multi-tenant workspace for a studio and its clients. The studio runs projects, uploads deliverable versions, and sends invoices. The client reviews a version, approves it, or sends it back. A person in one studio cannot open another studio's project.

There is no hosted demo. Run it locally. With no database URL, the API boots an in-memory MongoDB and loads Northline Studio.

## Stack

| Layer | What it uses |
| --- | --- |
| Web | React, Vite, React Router, Tailwind |
| API | Node.js, Express |
| Data | MongoDB, Mongoose |
| Auth | JWT, bcrypt |
| Files | Multer, stored on disk for local development |
| Jobs | A timer in the API process that marks overdue invoices |

The browser talks to Express through the Vite proxy in development. In production the API can serve the built React app from the same process.

## Roles

Registration creates an owner and a new organization. Invites can add the other roles. The role lives on the membership, not on the user, because the same person could belong to more than one studio.

| Role | What they can do |
| --- | --- |
| Owner | Everything, including changing the plan |
| Admin | Everything except changing the plan |
| Manager | Clients, projects, tasks, deliverables, invoices, team invites |
| Employee | Projects they are a member of. They can move a task's status and upload a deliverable. They cannot create projects or invoices |
| Client | Their own client's projects, deliverable decisions, and invoices that have been sent |

A permission is `resource:action`, for example `deliverable:approve` or `invoice:create`. Routes call `authorize` with the permission. The UI hides buttons from the same list, and the API still rejects a direct call.

## Tenancy

Every project, client, task, deliverable, invoice, and activity row stores `organization`. The request must send `X-Organization-Id`. The middleware loads the membership for that user and that organization. A missing membership is 403.

Project reads also apply a visibility filter:

- Owner, admin, and manager see every project in the studio.
- An employee sees projects whose member list includes them.
- A client sees projects for the client record linked to their membership.

A project outside that filter is 404. The response does not say whether the id exists in another studio. Creating a project with another studio's client id is also 404, because the client lookup is scoped to the caller's organization.

## Plans and quotas

| | Free | Pro ₹499/mo | Business ₹1,499/mo |
| --- | --- | --- | --- |
| Projects | 2 | 20 | Unlimited |
| Clients | 5 | 50 | Unlimited |
| Team members | 2 | 10 | 50 |
| Storage | 500 MB | 10 GB | 100 GB |
| Invoices | Yes | Yes | Yes |
| Analytics charts | No | Yes | Yes |
| Custom branding | No | No | Yes |

Team members are staff memberships. A client portal login does not consume a seat. Completed projects still count toward the project quota.

Before a create, the API counts current usage. At 20 of 20 projects the next create is 402. Operational counts on the overview stay available on Free. Charts require Pro or Business.

Plan changes on the Plan page are a sandbox. They update `organization.plan` immediately and do not charge a card. A downgrade is rejected when current usage is already over the smaller limit. Wire a payment provider before charging anyone.

## Deliverable versions

A deliverable has versions. The latest version is the one a client can decide.

- The first upload creates version 1 in `PENDING_REVIEW`.
- Approve and request-changes are legal only from `PENDING_REVIEW`. A second decision on the same version is 409.
- Requesting changes requires a comment.
- The next file is legal only after `CHANGES_REQUESTED` or `APPROVED`. Uploading while a review is open is 409.
- The new version starts again at `PENDING_REVIEW`.

Each version stores the version number, who uploaded it, when, the change note, the file, and the status.

## Invoices

Amounts are whole rupees. Tax is rounded to the nearest rupee. Website Development ₹50,000 plus SEO ₹20,000 at 18% GST is ₹12,600 tax and ₹82,600 total. The server computes that. The client does not send the total.

| From | Allowed next states |
| --- | --- |
| Draft | Sent, Cancelled |
| Sent | Viewed, Paid, Overdue, Cancelled |
| Viewed | Paid, Overdue, Cancelled |
| Overdue | Paid, Cancelled |
| Paid | none |
| Cancelled | none |

Draft to Paid is 409. A client opening a sent invoice moves it to Viewed. Clients do not receive drafts. About once a minute the API marks Sent or Viewed invoices past their due date as Overdue, writes an activity row, and notifies owners, admins, and managers. That function is the thing a queue worker would call if the app ran as more than one process.

## Activity

An activity row stores the actor, action, resource, resource id, optional project, timestamp, and metadata. The feed reads, for example, "Priya Shah requested changes on Homepage Design v1". Clients and employees only see events for projects they can already open.

## Demo

Password for every demo account: `demo1234`

| Email | Studio | Role |
| --- | --- | --- |
| owner@northline.studio | Northline Studio | Owner, Pro plan |
| rahul@northline.studio | Northline Studio | Manager |
| ananya@northline.studio | Northline Studio | Employee |
| priya@abcpvt.com | Northline Studio | Client of ABC Pvt Ltd |
| meera@harbor.co | Harbor & Co | Owner of a different studio |

Northline's website project has Homepage Design v1 (changes requested) and v2 (pending review), an approved logo, a task board, and invoice #1024 for ₹82,600. Sign in as Priya to approve v2. Sign in as Meera and the Northline project id will not load.

## How to run it locally

Use Node.js 20 or newer.

```bash
npm install
npm run setup
npm run dev
```

Open http://localhost:5173. The API listens on port 4000.

`npm run dev` uses an in-memory database when `MONGODB_URI` is unset, and loads the demo on boot. Data disappears when the API stops.

For a database that keeps data, start MongoDB and point the API at it:

```bash
docker compose up -d
cp backend/.env.example backend/.env
npm run seed --prefix backend
```

Set `JWT_SECRET` in that file before you share the machine. Do not commit `.env`.

```bash
npm test
npm run build
```

`npm test` covers the GST total, the quota check, the permission matrix, illegal invoice and deliverable transitions, and a request from studio B for studio A's project.

`npm start` with `NODE_ENV=production`, `MONGODB_URI`, and `JWT_SECRET` serves the API and, if `frontend/dist` exists, the built web app, on `0.0.0.0:$PORT`.

## Layout

```
backend/src/domain        permissions, plan limits, invoice and deliverable rules
backend/src/middleware    JWT, organization membership, permission checks
backend/src/routes        HTTP
backend/src/services      quotas, activity, notifications, overview, PDF
backend/src/jobs          overdue invoices
frontend/src              React app
```

The domain modules do not import Mongoose. Routes do not trust a role or an organization id from the JSON body.
