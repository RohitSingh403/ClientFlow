import Link from "next/link";
import { logout, switchOrganization } from "@/server/auth";
import { SideNav } from "@/components/nav";

export function Shell({
  orgName,
  planLabel,
  userName,
  email,
  unread,
  items,
  memberships,
  currentMembershipId,
  accent,
  children,
}: {
  orgName: string;
  planLabel: string;
  userName: string;
  email: string;
  unread: number;
  items: { href: string; label: string }[];
  memberships: { id: string; orgName: string }[];
  currentMembershipId: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen md:pl-60" style={accent ? { borderTop: `4px solid ${accent}` } : undefined}>
      <aside className="no-print fixed inset-y-0 left-0 hidden w-60 flex-col bg-pine px-4 py-5 text-cream md:flex">
        <Link href="/dashboard" className="px-2 font-serif text-2xl">
          ClientFlow
        </Link>
        <p className="mt-1 px-2 text-sm text-[#c9d7d1]">{orgName}</p>
        <div className="mt-6 flex-1">
          <SideNav items={items} />
        </div>
        <div className="border-t border-white/10 pt-4">
          <p className="px-2 text-sm">{userName}</p>
          <p className="px-2 text-xs text-[#c9d7d1]">{email}</p>
          <form action={logout} className="mt-3">
            <button className="btn btn-ghost border-white/20 text-cream" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div>
        <header className="no-print sticky top-0 z-10 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="font-serif text-xl md:hidden">
                ClientFlow
              </Link>
              <div>
                <p className="text-sm text-muted">{planLabel}</p>
                <p className="font-medium">{orgName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {memberships.length > 1 ? (
                <form action={switchOrganization} className="flex items-center gap-2">
                  <select name="membershipId" defaultValue={currentMembershipId} className="w-auto">
                    {memberships.map((membership) => (
                      <option key={membership.id} value={membership.id}>
                        {membership.orgName}
                      </option>
                    ))}
                  </select>
                  <button className="btn btn-ghost" type="submit">
                    Switch
                  </button>
                </form>
              ) : null}
              <Link href="/notifications" className="btn btn-ghost">
                Notifications{unread > 0 ? ` (${unread})` : ""}
              </Link>
              <form action={logout}>
                <button className="btn btn-ghost" type="submit">
                  Sign out
                </button>
              </form>
            </div>
          </div>
          <div className="mt-3 md:hidden">
            <SideNav items={items} />
          </div>
        </header>
        <main className="app-main px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
