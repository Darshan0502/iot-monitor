import type { Alert } from '@/lib/api';
import { timeAgo } from '@/lib/format';

interface Props {
  alerts: Alert[];
  now: Date | null;
  empty: string;
}

export function AlertList({ alerts, now, empty }: Props) {
  if (alerts.length === 0) {
    return <p className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
      {alerts.map((alert) => (
        <li key={alert.id} className="flex gap-3 p-3">
          <span
            aria-hidden
            className={`mt-1.5 size-2 shrink-0 rounded-full ${alert.resolvedAt ? 'bg-zinc-300 dark:bg-zinc-600' : alert.type === 'OFFLINE' ? 'bg-zinc-500' : 'bg-red-500'}`}
          />
          <div className="min-w-0 text-sm">
            <p className={alert.resolvedAt ? 'text-zinc-500' : ''}>{alert.message}</p>
            <p className="text-xs text-zinc-500">
              {alert.device.name} · started{' '}
              <time dateTime={alert.startedAt}>{now ? timeAgo(alert.startedAt, now) : ''}</time>
              {alert.resolvedAt && (
                <>
                  {' '}
                  · resolved <time dateTime={alert.resolvedAt}>{now ? timeAgo(alert.resolvedAt, now) : ''}</time>
                </>
              )}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
