import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { Banner, Button, Field, controlClass } from '../components/ui.jsx';
import { errorMessage } from '../format.js';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', organizationName: '' });
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      await register(form);
      navigate('/app');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-screen max-w-5xl items-center gap-10 px-5 py-10 md:grid-cols-2">
      <div>
        <Link className="font-serif text-3xl" to="/">ClientFlow</Link>
        <h1 className="mt-6 font-serif text-5xl leading-tight">Open your studio.</h1>
        <p className="mt-3 text-sm text-ink-soft">
          You become the owner. The free plan includes 2 projects, 5 clients, and 2 team members. Upgrade later from the plan page.
        </p>
      </div>
      <form className="space-y-4 rounded-[28px] border border-line bg-card p-6" onSubmit={onSubmit}>
        {error ? <Banner>{error}</Banner> : null}
        <Field label="Your name">
          <input className={controlClass} value={form.name} onChange={(event) => set('name', event.target.value)} required />
        </Field>
        <Field label="Studio name">
          <input className={controlClass} value={form.organizationName} onChange={(event) => set('organizationName', event.target.value)} required />
        </Field>
        <Field label="Email">
          <input className={controlClass} type="email" value={form.email} onChange={(event) => set('email', event.target.value)} required />
        </Field>
        <Field label="Password">
          <input className={controlClass} type="password" minLength={8} value={form.password} onChange={(event) => set('password', event.target.value)} required />
        </Field>
        <Button className="w-full" disabled={pending} type="submit">{pending ? 'Creating…' : 'Create studio'}</Button>
        <p className="text-sm text-ink-soft">
          Already inside? <Link className="font-semibold text-ink" to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
