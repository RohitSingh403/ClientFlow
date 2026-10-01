import { inr } from '../format.js';

export function BarChart({ rows }) {
  const max = Math.max(...rows.map((row) => row.total), 1);
  const empty = rows.every((row) => row.total === 0);
  if (empty) return <p className="text-sm text-ink-soft">Paid invoices will show up here.</p>;
  return (
    <div className="flex h-44 items-end gap-2">
      {rows.map((row) => (
        <div key={row.key} className="flex h-full flex-1 flex-col justify-end gap-2">
          <div
            className="rounded-t-lg bg-copper"
            style={{ height: `${Math.max((row.total / max) * 100, row.total ? 8 : 0)}%` }}
            title={inr(row.total)}
          />
          <span className="text-center text-xs text-ink-soft">{row.label}</span>
        </div>
      ))}
    </div>
  );
}

export function MeterList({ rows, labelFor }) {
  if (!rows?.length) return <p className="text-sm text-ink-soft">Nothing to chart yet.</p>;
  const max = Math.max(...rows.map((row) => row.count), 1);
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.status}>
          <div className="mb-1 flex justify-between text-sm">
            <span>{labelFor(row.status)}</span>
            <span className="text-ink-soft">{row.count}</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-navy" style={{ width: `${(row.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
