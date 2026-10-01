import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [orgId, setOrgId] = useState(localStorage.getItem('cf_org'));

  const membership = memberships.find((item) => item.organization.id === orgId) || memberships[0] || null;

  useEffect(() => {
    const token = localStorage.getItem('cf_token');
    if (!token) {
      setReady(true);
      return;
    }
    api
      .get('/auth/me')
      .then((response) => {
        setUser(response.data.user);
        setMemberships(response.data.memberships);
        const saved = localStorage.getItem('cf_org');
        const match = response.data.memberships.some((item) => item.organization.id === saved);
        const next = match ? saved : response.data.memberships[0]?.organization.id;
        if (next) {
          localStorage.setItem('cf_org', next);
          setOrgId(next);
        }
      })
      .catch(() => {
        localStorage.removeItem('cf_token');
        localStorage.removeItem('cf_org');
      })
      .finally(() => setReady(true));
  }, []);

  function persist(token, organizationId, nextUser, nextMemberships) {
    localStorage.setItem('cf_token', token);
    localStorage.setItem('cf_org', organizationId);
    setUser(nextUser);
    setMemberships(nextMemberships);
    setOrgId(organizationId);
  }

  async function login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    const first = response.data.memberships[0];
    persist(response.data.token, first.organization.id, response.data.user, response.data.memberships);
    return response.data;
  }

  async function register(payload) {
    const response = await api.post('/auth/register', payload);
    persist(response.data.token, response.data.organization.id, response.data.user, [response.data.membership]);
    return response.data;
  }

  function switchOrg(nextId) {
    localStorage.setItem('cf_org', nextId);
    setOrgId(nextId);
  }

  function logout() {
    localStorage.removeItem('cf_token');
    localStorage.removeItem('cf_org');
    setUser(null);
    setMemberships([]);
    setOrgId(null);
  }

  const value = useMemo(
    () => ({
      ready,
      user,
      memberships,
      membership,
      organization: membership?.organization || null,
      can: (permission) => Boolean(membership?.permissions?.includes(permission)),
      login,
      register,
      logout,
      switchOrg,
    }),
    [ready, user, memberships, membership],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
