import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cf_token');
  const org = localStorage.getItem('cf_org');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (org) config.headers['X-Organization-Id'] = org;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    if (error.response?.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/register')) {
      localStorage.removeItem('cf_token');
      localStorage.removeItem('cf_org');
      if (!window.location.pathname.startsWith('/login')) window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);
