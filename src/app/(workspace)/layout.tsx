import { db } from "@/lib/db";
import { PLANS } from "@/lib/entitlements";
import { can } from "@/lib/permissions";
import { requireUser } from "@/server/guard";
import { Shell } from "@/components/shell";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/dashboard", label: "Overview", permission: "project:view" },
  { href: "/projects", label: "Projects", permission: "project:view" },
  { href: "/approvals", label: "Approvals", permission: "deliverable:view" },
  { href: "/clients", label: "Clients", permission: "client:view" },
  { href: "/invoices", label: "Invoices", permission: "invoice:view" },
  { href: "/activity", label: "Activity", permission: "activity:view" },
  { href: "/team", label: "Team", permission: "member:view" },
  { href: "/settings", label: "Plan & usage", permission: "settings:view" },
];

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireUser();
  const [unread, memberships] = await Promise.all([
    db.notification.count({
      where: { userId: ctx.userId, organizationId: ctx.organizationId, read: false },
    }),
    db.membership.findMany({
      where: { userId: ctx.userId },
      include: { organization: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const accent =
    PLANS[ctx.organization.plan].branding && ctx.organization.brandColor && /^#[0-9a-fA-F]{6}$/.test(ctx.organization.brandColor)
      ? ctx.organization.brandColor
      : undefined;

  return (
    <Shell
      orgName={ctx.organization.name}
      planLabel={PLANS[ctx.organization.plan].label}
      userName={ctx.user.name}
      email={ctx.user.email}
      unread={unread}
      items={NAV.filter((item) => can(ctx.role, item.permission))}
      memberships={memberships.map((membership) => ({ id: membership.id, orgName: membership.organization.name }))}
      currentMembershipId={ctx.membershipId}
      accent={accent}
    >
      {children}
    </Shell>
  );
}
