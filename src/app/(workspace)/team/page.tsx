import { InviteForm } from "@/components/forms";
import { PageHeader, StatusPill } from "@/components/ui";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { requireUser } from "@/server/guard";
import { removeMember } from "@/server/workspace";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const ctx = await requireUser();
  if (!can(ctx.role, "member:view")) return null;
  const members = await db.membership.findMany({
    where: { organizationId: ctx.organizationId, role: { not: "CLIENT" } },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
      <div>
        <PageHeader eyebrow="People" title="Team" />
        <div className="grid gap-2">
          {members.map((member) => (
            <article key={member.id} className="card flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{member.user.name}</p>
                <p className="text-sm text-muted">{member.user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={member.role} />
                {can(ctx.role, "member:remove") && member.role !== "OWNER" && member.userId !== ctx.userId ? (
                  <form action={removeMember}>
                    <input type="hidden" name="membershipId" value={member.id} />
                    <button className="btn btn-danger" type="submit">
                      Remove
                    </button>
                  </form>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
      {can(ctx.role, "member:invite") ? <InviteForm /> : null}
    </div>
  );
}
