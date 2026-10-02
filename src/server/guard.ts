import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PLANS, type Plan } from "@/lib/entitlements";
import { can } from "@/lib/permissions";
import { getContext, type WorkspaceContext } from "@/lib/session";

export type ActionState = { error?: string; message?: string } | null;

export async function requireUser(): Promise<WorkspaceContext> {
  const ctx = await getContext();
  if (!ctx) redirect("/login");
  return ctx;
}

export async function authorize(permission: string): Promise<{ ok: true; ctx: WorkspaceContext } | { ok: false; error: string }> {
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "Sign in to continue." };
  if (!can(ctx.role, permission)) return { ok: false, error: "You do not have permission to do that." };
  return { ok: true, ctx };
}

export async function usageSnapshot(organizationId: string, plan: Plan) {
  const [projects, clients, members, storage] = await Promise.all([
    db.project.count({ where: { organizationId } }),
    db.client.count({ where: { organizationId } }),
    db.membership.count({ where: { organizationId, role: { not: "CLIENT" } } }),
    db.deliverableVersion.aggregate({ where: { organizationId }, _sum: { byteSize: true } }),
  ]);
  return {
    projects,
    clients,
    members,
    storageBytes: storage._sum.byteSize ?? 0,
    limits: PLANS[plan],
  };
}
