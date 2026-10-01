import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

const LINKS = [
  { to: '/app', label: 'Overview', end: true },
  { to: '/app/clients', label: 'Clients', permission: 'client:view' },
  { to: '/app/projects', label: 'Projects', permission: 'project:view' },
  { to: '/app/invoices', label: 'Invoices', permission: 'invoice:view' },
  { to: '/app/activity', label: 'Activity', permission: 'activity:view' },
  { to: '/app/team', label: 'Team', permission: 'member:view' },
  { to: '/app/billing', label: 'Plan', permission: 'billing:view' },
];

export default function Shell() {
  const { user, organization, membership, memberships, can, logout, switchOrg } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const accent = organization?.features?.branding && organization.branding?.accent
    ? organization.branding.accent
    : '';

  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const response = await api.get('/notifications');
        if (!stop) setUnread(response.data.unreadCount);
      } catch {
        if (!stop) setUnread(0);
      }
    }
    load();
    const timer = setInterval(load, 20000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [organization?.id]);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]" style={accent ? { '--color-copper': accent } : undefined}>
      <aside className="bg-navy text-paper md:min-h-screen">
        <div className="flex items-center justify-between px-5 py-5 md:block">
          <div>
            <p className="font-serif text-3xl leading-none">ClientFlow</p>
            <p className="mt-2 text-sm text-paper/70">{organization?.name}</p>
          </div>
          <button
            className="rounded-full border border-white/15 px-3 py-1 text-xs md:mt-4"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            type="button"
          >
            Sign out
          </button>
        </div>
        {memberships.length > 1 ? (
          <div className="px-5 pb-3">
            <select
              className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm"
              value={organization?.id}
              onChange={(event) => switchOrg(event.target.value)}
            >
              {memberships.map((item) => (
                <option key={item.organization.id} value={item.organization.id}>
                  {item.organization.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <nav className="flex gap-1 overflow-x-auto px-3 pb-4 md:block md:space-y-1 md:px-3">
          {LINKS.filter((link) => !link.permission || can(link.permission)).map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `block whitespace-nowrap rounded-full px-3 py-2 text-sm ${isActive ? 'bg-white/15 text-white' : 'text-paper/75 hover:bg-white/10'}`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <NavLink
            to="/app/notifications"
            className={({ isActive }) =>
              `block whitespace-nowrap rounded-full px-3 py-2 text-sm ${isActive ? 'bg-white/15 text-white' : 'text-paper/75 hover:bg-white/10'}`
            }
          >
            Inbox{unread ? ` (${unread})` : ''}
          </NavLink>
        </nav>
        <div className="hidden px-5 pb-6 md:block">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="text-xs uppercase tracking-wide text-paper/50">{membership?.role}</p>
        </div>
      </aside>
      <main className="px-4 py-6 sm:px-8 sm:py-8">
        <Outlet key={organization?.id} />
      </main>
    </div>
  );
}
