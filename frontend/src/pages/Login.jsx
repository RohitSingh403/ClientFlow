import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { Banner, Button, Field, controlClass } from '../components/ui.jsx';
import { errorMessage } from '../format.js';

const DEMOS = [
  ['Agency owner', 'owner@northline.studio'],
  ['Client', 'priya@abcpvt.com'],
  ['Employee', 'ananya@northline.studio'],
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('owner@northline.studio');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      await login(email, password);
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
        <h1 className="mt-6 font-serif text-5xl leading-tight">Sign in to the studio.</h1>
        <p className="mt-3 text-sm text-ink-soft">
          The Northline demo is already loaded when you start the API without a database URL. Every demo account uses the password demo1234.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {DEMOS.map(([label, value]) => (
            <button
              key={value}
              className="rounded-full border border-line bg-card px-3 py-1.5 text-sm"
              type="button"
              onClick={() => setEmail(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <form className="space-y-4 rounded-[28px] border border-line bg-card p-6" onSubmit={onSubmit}>
        {error ? <Banner>{error}</Banner> : null}
        <Field label="Email">
          <input className={controlClass} value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
        </Field>
        <Field label="Password">
          <input className={controlClass} value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
        </Field>
        <Button className="w-full" disabled={pending} type="submit">{pending ? 'Signing in…' : 'Sign in'}</Button>
        <p className="text-sm text-ink-soft">
          New studio? <Link className="font-semibold text-ink" to="/register">Create one</Link>
        </p>
      </form>
    </div>
  );
}
