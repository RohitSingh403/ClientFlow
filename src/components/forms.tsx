"use client";

import { useActionState, useEffect, useState } from "react";
import { createDeliverable, reviewDeliverable, uploadVersion, addComment } from "@/server/deliverables";
import { cancelInvoice, collectInvoice, createInvoice, markInvoiceViewed, sendInvoice } from "@/server/invoices";
import { runJobs } from "@/server/notifications";
import {
  addMilestone,
  addProjectMember,
  changePlan,
  createClient,
  createProject,
  createTask,
  deleteProject,
  grantPortal,
  inviteMember,
  updateBrand,
  updateProjectStatus,
  updateTaskStatus,
} from "@/server/workspace";
import { Feedback, SubmitButton } from "@/components/submit-button";
import { PROJECT_STATUSES, TASK_STATUSES } from "@/lib/workflow";
import { PROJECT_LABEL, TASK_LABEL } from "@/lib/format";

export function CreateClientForm() {
  const [state, action] = useActionState(createClient, null);
  return (
    <form action={action} className="card grid gap-3">
      <h2 className="font-serif text-xl">New client</h2>
      <label className="label">
        Company
        <input name="company" required />
      </label>
      <label className="label">
        Contact
        <input name="contactName" required />
      </label>
      <label className="label">
        Email
        <input name="email" type="email" required />
      </label>
      <label className="label">
        Phone
        <input name="phone" />
      </label>
      <Feedback state={state} />
      <SubmitButton>Add client</SubmitButton>
    </form>
  );
}

export function CreateProjectForm({ clients }: { clients: { id: string; company: string }[] }) {
  const [state, action] = useActionState(createProject, null);
  return (
    <form action={action} className="card grid gap-3">
      <h2 className="font-serif text-xl">New project</h2>
      <label className="label">
        Name
        <input name="name" required />
      </label>
      <label className="label">
        Client
        <select name="clientId" required defaultValue="">
          <option value="" disabled>
            Choose a client
          </option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.company}
            </option>
          ))}
        </select>
      </label>
      <label className="label">
        Status
        <select name="status" defaultValue="ACTIVE">
          {PROJECT_STATUSES.filter((status) => status !== "COMPLETED").map((status) => (
            <option key={status} value={status}>
              {PROJECT_LABEL[status]}
            </option>
          ))}
        </select>
      </label>
      <label className="label">
        Description
        <textarea name="description" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="label">
          Start
          <input name="startDate" type="date" />
        </label>
        <label className="label">
          Due
          <input name="dueDate" type="date" />
        </label>
      </div>
      <Feedback state={state} />
      <SubmitButton>Create project</SubmitButton>
    </form>
  );
}

export function ProjectStatusForm({ projectId, status }: { projectId: string; status: string }) {
  const [state, action] = useActionState(updateProjectStatus, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <label className="label min-w-40">
        Status
        <select name="status" defaultValue={status}>
          {PROJECT_STATUSES.map((item) => (
            <option key={item} value={item}>
              {PROJECT_LABEL[item]}
            </option>
          ))}
        </select>
      </label>
      <SubmitButton variant="pine">Save</SubmitButton>
      <Feedback state={state} />
    </form>
  );
}

export function DeleteProjectForm({ projectId }: { projectId: string }) {
  const [state, action] = useActionState(deleteProject, null);
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <Feedback state={state} />
      <SubmitButton variant="danger">Delete project</SubmitButton>
    </form>
  );
}

export function MilestoneForm({ projectId }: { projectId: string }) {
  const [state, action] = useActionState(addMilestone, null);
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <input name="title" placeholder="Milestone" required />
      <input name="dueDate" type="date" />
      <Feedback state={state} />
      <SubmitButton variant="ghost">Add milestone</SubmitButton>
    </form>
  );
}

export function TaskForm({
  projectId,
  people,
  milestones,
}: {
  projectId: string;
  people: { id: string; name: string }[];
  milestones: { id: string; title: string }[];
}) {
  const [state, action] = useActionState(createTask, null);
  return (
    <form action={action} className="card grid gap-3">
      <h2 className="font-serif text-xl">New task</h2>
      <input type="hidden" name="projectId" value={projectId} />
      <input name="title" placeholder="What needs doing?" required />
      <div className="grid gap-3 md:grid-cols-3">
        <select name="assigneeId" defaultValue="">
          <option value="">Unassigned</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
        <select name="milestoneId" defaultValue="">
          <option value="">No milestone</option>
          {milestones.map((milestone) => (
            <option key={milestone.id} value={milestone.id}>
              {milestone.title}
            </option>
          ))}
        </select>
        <input name="dueDate" type="date" />
      </div>
      <Feedback state={state} />
      <SubmitButton variant="ghost">Add task</SubmitButton>
    </form>
  );
}

export function TaskStatusForm({ taskId, status }: { taskId: string; status: string }) {
  const [state, action] = useActionState(updateTaskStatus, null);
  return (
    <form action={action} className="mt-3 grid gap-2">
      <input type="hidden" name="taskId" value={taskId} />
      <select name="status" defaultValue={status}>
        {TASK_STATUSES.map((item) => (
          <option key={item} value={item}>
            {TASK_LABEL[item]}
          </option>
        ))}
      </select>
      <Feedback state={state} />
      <SubmitButton variant="ghost">Move</SubmitButton>
    </form>
  );
}

export function ProjectMemberForm({
  projectId,
  people,
}: {
  projectId: string;
  people: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(addProjectMember, null);
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <select name="userId" required defaultValue="">
        <option value="" disabled>
          Add a teammate
        </option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </select>
      <Feedback state={state} />
      <SubmitButton variant="ghost">Add to project</SubmitButton>
    </form>
  );
}

export function DeliverableForm({ projectId }: { projectId: string }) {
  const [state, action] = useActionState(createDeliverable, null);
  return (
    <form action={action} className="card grid gap-3">
      <h2 className="font-serif text-xl">Upload deliverable</h2>
      <input type="hidden" name="projectId" value={projectId} />
      <input name="title" placeholder="Homepage design" required />
      <textarea name="changeDescription" placeholder="What is in version 1?" />
      <input name="file" type="file" accept=".png,.jpg,.jpeg,.webp,.svg,.pdf" required />
      <Feedback state={state} />
      <SubmitButton>Upload v1</SubmitButton>
    </form>
  );
}

export function VersionForm({ deliverableId }: { deliverableId: string }) {
  const [state, action] = useActionState(uploadVersion, null);
  return (
    <form action={action} className="mt-3 grid gap-2">
      <input type="hidden" name="deliverableId" value={deliverableId} />
      <textarea name="changeDescription" placeholder="What changed in this version?" required />
      <input name="file" type="file" accept=".png,.jpg,.jpeg,.webp,.svg,.pdf" required />
      <Feedback state={state} />
      <SubmitButton>Upload next version</SubmitButton>
    </form>
  );
}

export function ReviewForm({ versionId }: { versionId: string }) {
  const [state, action] = useActionState(reviewDeliverable, null);
  return (
    <form action={action} className="mt-3 grid gap-2">
      <input type="hidden" name="versionId" value={versionId} />
      <textarea name="note" placeholder="Notes for the team" />
      <Feedback state={state} />
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" name="decision" value="APPROVED" type="submit">
          Approve
        </button>
        <button className="btn btn-danger" name="decision" value="CHANGES_REQUESTED" type="submit">
          Request changes
        </button>
      </div>
    </form>
  );
}

export function CommentForm({ versionId }: { versionId: string }) {
  const [state, action] = useActionState(addComment, null);
  return (
    <form action={action} className="mt-2 grid gap-2">
      <input type="hidden" name="versionId" value={versionId} />
      <input name="body" placeholder="Add a comment" required />
      <Feedback state={state} />
      <SubmitButton variant="ghost">Comment</SubmitButton>
    </form>
  );
}

export function InvoiceForm({ projects }: { projects: { id: string; name: string; company: string }[] }) {
  const [state, action] = useActionState(createInvoice, null);
  const [rows, setRows] = useState([{ description: "", amount: "" }]);
  return (
    <form action={action} className="card grid gap-3">
      <h2 className="font-serif text-xl">New invoice</h2>
      <label className="label">
        Project
        <select name="projectId" required defaultValue="">
          <option value="" disabled>
            Choose a project
          </option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name} · {project.company}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="label">
          Due
          <input name="dueDate" type="date" required />
        </label>
        <label className="label">
          Tax
          <select name="taxRate" defaultValue="18">
            <option value="18">GST 18%</option>
            <option value="12">GST 12%</option>
            <option value="5">GST 5%</option>
            <option value="0">No tax</option>
          </select>
        </label>
      </div>
      {rows.map((row, index) => (
        <div key={index} className="grid grid-cols-[1fr_8rem] gap-2">
          <input
            name="description"
            placeholder="Description"
            value={row.description}
            onChange={(event) => {
              const next = [...rows];
              next[index] = { ...row, description: event.target.value };
              setRows(next);
            }}
          />
          <input
            name="amount"
            placeholder="₹"
            inputMode="decimal"
            value={row.amount}
            onChange={(event) => {
              const next = [...rows];
              next[index] = { ...row, amount: event.target.value };
              setRows(next);
            }}
          />
        </div>
      ))}
      <button type="button" className="btn btn-ghost" onClick={() => setRows([...rows, { description: "", amount: "" }])}>
        Add line
      </button>
      <Feedback state={state} />
      <SubmitButton>Save draft</SubmitButton>
    </form>
  );
}

export function InvoiceViewBeacon({ invoiceId }: { invoiceId: string }) {
  useEffect(() => {
    void markInvoiceViewed(invoiceId);
  }, [invoiceId]);
  return null;
}

export function InvoiceActions({ invoiceId, status }: { invoiceId: string; status: string }) {
  const [sendState, send] = useActionState(sendInvoice, null);
  const [payState, pay] = useActionState(collectInvoice, null);
  const [cancelState, cancel] = useActionState(cancelInvoice, null);
  return (
    <div className="no-print grid gap-3">
      {status === "DRAFT" ? (
        <form action={send}>
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <SubmitButton>Send invoice</SubmitButton>
          <Feedback state={sendState} />
        </form>
      ) : null}
      {status === "SENT" || status === "VIEWED" || status === "OVERDUE" ? (
        <form action={pay}>
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <SubmitButton variant="pine">Record payment</SubmitButton>
          <Feedback state={payState} />
        </form>
      ) : null}
      {status !== "PAID" && status !== "CANCELLED" ? (
        <form action={cancel}>
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <SubmitButton variant="danger">Cancel invoice</SubmitButton>
          <Feedback state={cancelState} />
        </form>
      ) : null}
    </div>
  );
}

export function InviteForm() {
  const [state, action] = useActionState(inviteMember, null);
  return (
    <form action={action} className="card grid gap-3">
      <h2 className="font-serif text-xl">Invite teammate</h2>
      <input name="name" placeholder="Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="text" placeholder="Password for a new account" />
      <select name="role" defaultValue="EMPLOYEE">
        <option value="EMPLOYEE">Employee</option>
        <option value="MANAGER">Manager</option>
        <option value="ADMIN">Admin</option>
      </select>
      <Feedback state={state} />
      <SubmitButton>Invite</SubmitButton>
    </form>
  );
}

export function PortalForm({ clients }: { clients: { id: string; company: string }[] }) {
  const [state, action] = useActionState(grantPortal, null);
  return (
    <form action={action} className="card grid gap-3">
      <h2 className="font-serif text-xl">Client portal</h2>
      <select name="clientId" required defaultValue="">
        <option value="" disabled>
          Client
        </option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.company}
          </option>
        ))}
      </select>
      <input name="name" placeholder="Their name" />
      <input name="email" type="email" placeholder="Their email" required />
      <input name="password" type="text" placeholder="Password if they are new" />
      <Feedback state={state} />
      <SubmitButton variant="ghost">Give access</SubmitButton>
    </form>
  );
}

export function PlanForm({ current }: { current: string }) {
  const [state, action] = useActionState(changePlan, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <label className="label">
        Plan
        <select name="plan" defaultValue={current}>
          <option value="FREE">Free</option>
          <option value="PRO">Pro · ₹499/month</option>
          <option value="BUSINESS">Business · ₹1,499/month</option>
        </select>
      </label>
      <SubmitButton>Change plan</SubmitButton>
      <Feedback state={state} />
    </form>
  );
}

export function BrandForm({ color }: { color: string | null }) {
  const [state, action] = useActionState(updateBrand, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <label className="label">
        Brand color
        <input name="brandColor" defaultValue={color ?? "#1a2e28"} />
      </label>
      <SubmitButton variant="ghost">Save color</SubmitButton>
      <Feedback state={state} />
    </form>
  );
}

export function JobButton() {
  const [state, action] = useActionState(runJobs, null);
  return (
    <form action={action} className="grid gap-2">
      <SubmitButton variant="pine">Run reminder job</SubmitButton>
      <Feedback state={state} />
    </form>
  );
}
