import Link from "next/link";
import { logout, switchOrganization } from "@/server/auth";
import { Mark } from "@/components/mark";
import { SideNav } from "@/components/nav";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

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
    <div className="min-h-screen md:pl-64" style={accent ? { borderTop: `3px solid ${accent}` } : undefined}>
      <a className="skip no-print" href="#main">
        Skip to content
      </a>
      <aside className="no-print fixed inset-y-0 left-0 hidden w-64 flex-col bg-pine px-4 py-5 text-cream md:flex">
        <Mark href="/dashboard" tone="cream" />
        <p className="mt-4 px-1 text-sm text-[#c9d7d1]">{orgName}</p>
        <p className="px-1 text-xs text-[#9fb2aa]">{planLabel}</p>
        <div className="mt-6 flex-1">
          <SideNav items={items} />
        </div>
        <div className="flex items-center gap-3 border-t border-white/10 pt-4">
          <span className="avatar" aria-hidden="true">
            {initials(userName) || "CF"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm">{userName}</p>
            <p className="truncate text-xs text-[#c9d7d1]">{email}</p>
          </div>
        </div>
        <form action={logout} className="mt-3">
          <button className="btn btn-ghost w-full border-white/15 text-cream" type="submit">
            Sign out
          </button>
        </form>
      </aside>
      <div>
        <header className="app-header no-print px-4 py-3 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="md:hidden">
                <Mark href="/dashboard" />
              </span>
              <div className="hidden md:block">
                <p className="text-xs text-muted">{planLabel}</p>
                <p className="font-medium">{orgName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {memberships.length > 1 ? (
                <form action={switchOrganization} className="flex items-center gap-2">
                  <label className="sr-only" htmlFor="membershipId">
                    Workspace
                  </label>
                  <select id="membershipId" name="membershipId" defaultValue={currentMembershipId} className="w-auto">
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
                Inbox
                {unread > 0 ? <span className="count">{unread}</span> : null}
              </Link>
              <form action={logout} className="md:hidden">
                <button className="btn btn-ghost" type="submit">
                  Sign out
                </button>
              </form>
            </div>
          </div>
          <div className="mt-3 md:hidden">
            <SideNav items={items} tone="light" />
          </div>
        </header>
        <main id="main" className="app-main mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
