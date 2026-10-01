export function Button({ children, kind = 'primary', className = '', ...props }) {
  const kinds = {
    primary: 'bg-copper text-white hover:bg-copper-dark',
    navy: 'bg-navy text-paper hover:bg-ink',
    ghost: 'bg-transparent text-ink hover:bg-black/5',
    line: 'border border-line bg-card text-ink hover:border-ink/30',
    danger: 'bg-wine text-white hover:opacity-90',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${kinds[kind]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

export const controlClass =
  'w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none ring-copper/30 placeholder:text-ink-soft/70 focus:ring-2';

export function Banner({ children, tone = 'wine' }) {
  const tones = {
    wine: 'border-wine/20 bg-wine-soft text-wine',
    sage: 'border-sage/20 bg-sage-soft text-sage',
  };
  return <div className={`rounded-2xl border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
}

export function Pill({ children, tone = 'muted' }) {
  const tones = {
    sage: 'bg-sage-soft text-sage',
    copper: 'bg-[#f8e6da] text-copper-dark',
    navy: 'bg-[#e7ebf2] text-navy',
    wine: 'bg-wine-soft text-wine',
    muted: 'bg-muted text-ink-soft',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Empty({ title, body, action }) {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-card px-6 py-12 text-center">
      <h3 className="font-serif text-2xl text-ink">{title}</h3>
      {body ? <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-navy/40 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-3xl bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-serif text-3xl">{title}</h2>
          <button className="text-sm text-ink-soft" onClick={onClose} type="button">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, body, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.16em] text-copper">{eyebrow}</p> : null}
        <h1 className="font-serif text-4xl leading-tight">{title}</h1>
        {body ? <p className="mt-2 max-w-2xl text-sm text-ink-soft">{body}</p> : null}
      </div>
      {action}
    </div>
  );
}
