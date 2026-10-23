import Link from 'next/link';

type Props = { title: string; actionLabel?: string; actionHref?: string };
export function SectionHeader({ title, actionLabel, actionHref }: Props) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="text-link">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
