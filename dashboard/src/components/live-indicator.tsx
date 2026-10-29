import type { LiveStatus } from '@/lib/live';

const TEXT: Record<LiveStatus, string> = {
  connecting: 'Connecting…',
  live: 'Live',
  reconnecting: 'Reconnecting…',
};

export function LiveIndicator({ status }: { status: LiveStatus }) {
  return (
    <span role="status" className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500">
      <span aria-hidden className={`size-2 rounded-full ${status === 'live' ? 'bg-emerald-500' : 'animate-pulse bg-amber-500'}`} />
      {TEXT[status]}
    </span>
  );
}
