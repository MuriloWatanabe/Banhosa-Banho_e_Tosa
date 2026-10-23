import type { ReactNode } from 'react';

type Props = { label: string; value: string; icon: ReactNode };
export function StatCard({ label, value, icon }: Props) {
  return (
    <article className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}
