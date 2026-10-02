import { labelFor, toneFor } from "@/lib/format";

export function StatusPill({ status }: { status: string }) {
  return (
    <span className="pill" data-tone={toneFor(status)}>
      {labelFor(status)}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="font-serif text-3xl leading-tight tracking-tight md:text-4xl">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function Meter({
  label,
  used,
  limit,
  displayLimit,
  usedLabel,
}: {
  label: string;
  used: number;
  limit: number;
  displayLimit: string;
  usedLabel?: string;
}) {
  const pct = Number.isFinite(limit) ? Math.min(100, Math.round((used / Math.max(limit, 1)) * 100)) : 12;
  const full = Number.isFinite(limit) && used >= limit;
  const shown = usedLabel ?? String(used);
  return (
    <div>
      <div className="flex justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="num text-muted">{Number.isFinite(limit) ? `${shown} / ${displayLimit}` : `${shown} · Unlimited`}</span>
      </div>
      <div className="meter">
        <span style={{ width: `${pct}%` }} data-full={full ? "true" : "false"} />
      </div>
    </div>
  );
}
